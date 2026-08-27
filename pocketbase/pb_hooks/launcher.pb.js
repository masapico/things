/// <reference path="../pb_data/types.d.ts" />

routerAdd("POST", "/api/things/launchers/{id}/launch", (e) => {
  const ip = e.realIP();
  if (ip !== "127.0.0.1" && ip !== "::1" && ip !== "::ffff:127.0.0.1") {
    return e.json(403, { message: "ランチャーはこの端末からのみ実行できます。" });
  }

  if ($os.getenv("OS") !== "Windows_NT") {
    return e.json(501, { message: "ランチャーの実行はWindowsでのみ利用できます。" });
  }

  let launcher;
  try {
    launcher = e.app.findRecordById("launchers", e.request.pathValue("id"));
  } catch (_) {
    return e.json(404, { message: "ランチャー項目が見つかりません。" });
  }

  const target = String(launcher.get("target") || "").trim();
  const argumentsText = String(launcher.get("arguments") || "");
  if (!target || target.length > 2048 || argumentsText.length > 4096) {
    return e.json(422, { message: "起動対象または引数が不正です。" });
  }

  try {
    $os.cmd(
      "powershell.exe",
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy", "Bypass",
      "-WindowStyle", "Hidden",
      "-File", __hooks + "/launch-target.ps1",
      "-Target", target,
      "-ArgumentsText", argumentsText
    ).run();
  } catch (error) {
    console.log("launcher start failed: " + error);
    return e.json(422, { message: "対象を起動できませんでした。パスと引数を確認してください。" });
  }

  return e.json(202, { success: true });
}, $apis.requireAuth());
