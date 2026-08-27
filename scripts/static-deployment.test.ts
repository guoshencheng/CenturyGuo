import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync,
  readdirSync, rmSync, symlinkSync, utimesSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Execute the workflow's real inline Bash; no copied release implementation.
const workflow = readFileSync(new URL("../.github/workflows/deploy.yml", import.meta.url), "utf8");
const publishStep = workflow.split("      - name: Publish static artifact\n")[1];
assert.ok(publishStep, "inline publish step is missing");
const block = publishStep.split("        run: |\n")[1];
assert.ok(block, "publish must use a literal run block");
const lines: string[] = [];
for (const line of block.split("\n")) {
  if (line.trim() && !line.startsWith("          ")) break;
  lines.push(line.slice(10));
}
const script = lines.join("\n");
const sha = "a".repeat(40);

function fixture(t: TestContext) {
  const root = mkdtempSync(join(tmpdir(), "static publish test "));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const bin = join(root, "bin");
  const runner = join(root, "runner temp");
  const dist = join(root, "dist");
  for (const dir of [bin, runner, dist]) mkdirSync(dir);
  writeFileSync(join(runner, "keep"), "unrelated file");
  writeFileSync(join(dist, "index.html"), "<html>blog</html>\n");
  function executable(name: string, code: string) {
    writeFileSync(join(bin, name), `#!/usr/bin/env node\n${code}\n`, { mode: 0o700 });
  }
  // Protocol tests use a fixture, not a substitute claim of real GNU packaging.
  executable("tar", `
    require('node:fs').writeFileSync(process.env.TAR_LOG, JSON.stringify(process.argv.slice(2)));
    if (process.env.TAR_EXIT) process.exit(Number(process.env.TAR_EXIT));
    process.stdout.write('archive fixture');
  `);
  // macOS lacks sha256sum; compute the real digest without adding a dependency.
  executable("sha256sum", `
    const bytes = require('node:fs').readFileSync(process.argv[2]);
    console.log(process.env.BAD_DIGEST || require('node:crypto').createHash('sha256').update(bytes).digest('hex'));
  `);
  executable("ssh", `
    const fs = require('node:fs');
    const args = process.argv.slice(2);
    const identity = args[args.indexOf('-i') + 1];
    const hosts = args.find(arg => arg.startsWith('UserKnownHostsFile=')).split('=')[1];
    fs.writeFileSync(process.env.ARCHIVE_CAPTURE, fs.readFileSync(0));
    fs.appendFileSync(process.env.SSH_LOG, JSON.stringify({
      args, identityMode: fs.statSync(identity).mode & 0o777,
      hostsMode: fs.statSync(hosts).mode & 0o777,
      identityMatches: fs.readFileSync(identity, 'utf8') === process.env.STATIC_DEPLOY_SSH_KEY + '\\n',
      hostsMatch: fs.readFileSync(hosts, 'utf8') === process.env.STATIC_DEPLOY_KNOWN_HOSTS + '\\n'
    }) + '\\n');
    console.log(process.env.SSH_JSON || '{"result":"published"}');
    console.error('server diagnostic');
    process.exit(Number(process.env.SSH_EXIT || 0));
  `);
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    RUNNER_TEMP: runner,
    DIST_DIR: dist,
    STATIC_DEPLOY_HOST: "deploy.example.test",
    STATIC_DEPLOY_SITE: "blog-test",
    GIT_COMMIT_SHA: sha,
    STATIC_DEPLOY_SSH_KEY: "TEST-PRIVATE-KEY\nTEST-SECOND-LINE",
    STATIC_DEPLOY_KNOWN_HOSTS: "TEST-HOST-KEY ssh-ed25519 fixture",
    TAR_LOG: join(root, "tar.json"),
    SSH_LOG: join(root, "ssh.jsonl"),
    ARCHIVE_CAPTURE: join(root, "archive.tar.gz"),
  };
  function run(extra: Record<string, string | undefined> = {}) {
    for (const path of [env.TAR_LOG, env.SSH_LOG, env.ARCHIVE_CAPTURE]) rmSync(path, { force: true });
    const result = spawnSync("bash", ["-c", script], {
      cwd: root, env: { ...env, ...extra }, encoding: "utf8", timeout: 15_000,
    });
    assert.ifError(result.error);
    assert.deepEqual(readdirSync(runner), ["keep"], "temporary files leaked");
    assert.equal(readFileSync(join(runner, "keep"), "utf8"), "unrelated file");
    for (const secret of ["TEST-PRIVATE-KEY", "TEST-SECOND-LINE", "TEST-HOST-KEY"]) {
      assert.ok(!(result.stdout + result.stderr).includes(secret), "secret leaked to logs");
    }
    return result;
  }
  return { root, bin, dist, env, run };
}

test("static publish: extracted Bash is valid", () => {
  const result = spawnSync("bash", ["-n"], { input: script, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});

test("static publish: rejects invalid inputs before packaging or SSH", (t) => {
  const f = fixture(t);
  const cases: Record<string, (string | undefined)[]> = {
    STATIC_DEPLOY_HOST: [undefined, "", "https://host", "user@host", "-host", "host/path", "host;id", "$(id)", "host\nname"],
    STATIC_DEPLOY_SITE: [undefined, "", "../blog", "Blog", "-blog", "blog-", "x".repeat(64)],
    GIT_COMMIT_SHA: [undefined, "", "a".repeat(7), "A".repeat(40), "a".repeat(41), "g".repeat(64)],
    STATIC_DEPLOY_SSH_KEY: [undefined, ""],
    STATIC_DEPLOY_KNOWN_HOSTS: [undefined, ""],
    RUNNER_TEMP: [undefined, "", "relative", join(f.root, "missing")],
    DIST_DIR: [undefined, "", join(f.root, "missing")],
  };
  for (const [key, values] of Object.entries(cases)) {
    for (const value of values) {
      const result = f.run({ [key]: value });
      assert.equal(result.status, 2, `${key}: ${value}\n${result.stderr}`);
      assert.equal(existsSync(f.env.TAR_LOG), false);
      assert.equal(existsSync(f.env.SSH_LOG), false);
    }
  }
});

test("static publish: rejects missing index, symlinks, hard links and special files", (t) => {
  const f = fixture(t);
  const index = join(f.dist, "index.html");
  const rejected = () => {
    assert.equal(f.run().status, 2);
    assert.equal(existsSync(f.env.TAR_LOG), false);
    assert.equal(existsSync(f.env.SSH_LOG), false);
  };
  rmSync(index);
  rejected();
  writeFileSync(join(f.root, "target"), "page");
  symlinkSync(join(f.root, "target"), index);
  rejected();
  rmSync(index);
  writeFileSync(index, "page");
  const bad = join(f.dist, "bad");
  symlinkSync(index, bad);
  rejected();
  rmSync(bad);
  linkSync(index, bad);
  rejected();
  rmSync(bad);
  assert.equal(spawnSync("mkfifo", [bad]).status, 0);
  rejected();
  rmSync(bad);
  const linkedDist = join(f.root, "linked-dist");
  symlinkSync(f.dist, linkedDist);
  assert.equal(f.run({ DIST_DIR: linkedDist }).status, 2);
});

test("static publish: one restricted SSH call receives bytes and matching SHA256", (t) => {
  const f = fixture(t);
  for (const version of [sha, "b".repeat(64)]) {
    const result = f.run({ GIT_COMMIT_SHA: version });
    assert.equal(result.status, 0, result.stderr);
    const records = readFileSync(f.env.SSH_LOG, "utf8").trim().split("\n").map(line => JSON.parse(line));
    assert.equal(records.length, 1);
    const record = records[0];
    assert.equal(record.identityMode, 0o600);
    assert.equal(record.hostsMode, 0o600);
    assert.equal(record.identityMatches, true);
    assert.equal(record.hostsMatch, true);
    for (const option of ["-T", "BatchMode=yes", "IdentitiesOnly=yes", "StrictHostKeyChecking=yes", "PasswordAuthentication=no", "ClearAllForwardings=yes"]) {
      assert.ok(record.args.includes(option), option);
    }
    const digest = createHash("sha256").update(readFileSync(f.env.ARCHIVE_CAPTURE)).digest("hex");
    assert.deepEqual(record.args.slice(-2), ["staticdeploy@deploy.example.test", `publish blog-test ${version} ${digest}`]);
    assert.ok(result.stdout.includes('{"result":"published"}'));
    assert.ok(result.stderr.includes("server diagnostic"));
  }
});

test("static publish: preserves health failure and SSH interruption without retry or rollback", (t) => {
  const f = fixture(t);
  const json = '{"error":"PUBLISH_HEALTH_FAILED","details":{"rollback":"restored","rollback_health":"ok"}}';
  for (const code of [17, 255]) {
    const result = f.run({ SSH_EXIT: String(code), SSH_JSON: json });
    assert.equal(result.status, code, result.stderr);
    assert.ok(result.stdout.includes(json));
    assert.equal(readFileSync(f.env.SSH_LOG, "utf8").trim().split("\n").length, 1);
  }
});

test("static publish: packaging or digest failure never reaches SSH", (t) => {
  const f = fixture(t);
  for (const extra of [{ TAR_EXIT: "9" }, { BAD_DIGEST: "invalid" }]) {
    assert.notEqual(f.run(extra).status, 0);
    assert.equal(existsSync(f.env.SSH_LOG), false);
  }
});

test("static publish: real GNU tar packaging is stable across file order and mtimes", (t) => {
  let tar: string | undefined;
  for (const command of ["gtar", "tar"]) {
    const result = spawnSync(command, ["--version"], { encoding: "utf8" });
    if (result.stdout?.includes("GNU tar")) {
      tar = spawnSync("which", [command], { encoding: "utf8" }).stdout.trim();
      break;
    }
  }
  if (!tar) {
    assert.notEqual(process.env.GITHUB_ACTIONS, "true", "Linux CI must have GNU tar");
    t.skip("GNU tar is unavailable locally; this check is required on the Linux runner");
    return;
  }
  const f = fixture(t);
  rmSync(join(f.bin, "tar"));
  symlinkSync(tar, join(f.bin, "tar"));
  const asset = join(f.dist, "app.js");
  writeFileSync(asset, "console.log('blog');");
  assert.equal(f.run().status, 0);
  const first = readFileSync(f.env.ARCHIVE_CAPTURE);
  const index = join(f.dist, "index.html");
  const html = readFileSync(index);
  rmSync(index);
  writeFileSync(index, html);
  chmodSync(index, 0o600);
  utimesSync(asset, new Date(0), new Date(0));
  assert.equal(f.run({ TAR_OPTIONS: "--dereference", GZIP: "-9" }).status, 0);
  assert.deepEqual(readFileSync(f.env.ARCHIVE_CAPTURE), first);
  const listing = spawnSync(tar, ["-tzf", f.env.ARCHIVE_CAPTURE], { encoding: "utf8" });
  assert.equal(listing.status, 0);
  assert.deepEqual(listing.stdout.trim().split("\n"), ["./", "./app.js", "./index.html"]);
});
