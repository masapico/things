# -------------------------------------------------
# グローバル変数（ファイルパス等）
# -------------------------------------------------
$global:menuFilePath = Join-Path -Path $PSScriptRoot -ChildPath "_menu.txt"

# -------------------------------------------------
# 1. メニュー読み込み関数（リロード対応）
# -------------------------------------------------
function Load-Menu {
    # ファイルが存在しない場合
    if (-not (Test-Path $menuFilePath)) {
        Write-Host "`n[エラー] _menu.txt が見つかりません。" -ForegroundColor Red
        Write-Host "想定パス: $menuFilePath`n" -ForegroundColor Gray
        return @() # 空の配列を返す
    }

    $newMenu = @()
    # 空白行や「#」で始まるコメント行を除外して読み込む
    $lines = Get-Content $menuFilePath -Encoding UTF8 | Where-Object { 
        -not [string]::IsNullOrWhiteSpace($_) -and $_ -notmatch '^\s*#' 
    }

    $no = 1
    foreach ($line in $lines) {
        # Name,Target[,Arguments] の形式で最大3分割（引数列は省略可）
        $parts = $line -split ',', 3
        if ($parts.Count -ge 2) {
            $newMenu += [pscustomobject]@{
                No        = $no
                Name      = $parts[0].Trim()
                Target    = $parts[1].Trim()
                Arguments = if ($parts.Count -eq 3) { $parts[2].Trim() } else { "" }
            }
            $no++
        }
    }

    if ($newMenu.Count -eq 0) {
        Write-Host "`n[警告] 読み込めるメニュー項目がありません。_menu.txt の内容を確認してください。" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }

    return $newMenu
}

# -------------------------------------------------
# 2. UI表示用関数
# -------------------------------------------------
function Show-Menu {
    param([array]$menuList, [string]$menuFilePathDisplay) # リロードされた最新のメニューを受け取る

    Clear-Host
    Write-Host "╭───────────────────────────────────────────────╮" -ForegroundColor Cyan
    Write-Host "│              🚀 O o o P E N  🚀               │" -ForegroundColor Cyan
    Write-Host "╰───────────────────────────────────────────────╯" -ForegroundColor Cyan

    if ($menuList.Count -eq 0) {
        Write-Host " [!] メニューが空です。_menu.txt を編集し [r] でリロードしてください。" -ForegroundColor Yellow
    } else {
        foreach ($item in $menuList) {
            Write-Host ("[{0,2}] " -f $item.No) -NoNewline -ForegroundColor Green
            Write-Host $item.Name -ForegroundColor White
            # Write-Host ("       > {0}" -f $item.Target) -ForegroundColor DarkGray
        }
    }
    Write-Host
    Write-Host "📄$menuFilePath📄" -ForegroundColor Blue
    Write-Host "`n ────────────────────────────────────────────────" -ForegroundColor Cyan
    # メニューに [r] リロード / [t] ToDo を追加
    Write-Host "    [No] 起動 | [r] メニューリロード | [q] 終了" -ForegroundColor Yellow
    Write-Host " ────────────────────────────────────────────────" -ForegroundColor Cyan
}

# -------------------------------------------------
# 3. メイン制御ロジック
# -------------------------------------------------
function Invoke-Selection {
    # 初回起動時のメニュー読み込み
    $menu = Load-Menu

    while ($true) {
        Show-Menu -menuList $menu

        $raw = Read-Host "`n 番号を入力しEnter"

        # ① 終了判定
        if ($raw -match '^[qQ]$') {
            Write-Host "`n OooPENを終了します。お疲れ様でした！" -ForegroundColor Green
            Start-Sleep -Seconds 1
            break
        }

        # ② リロード判定
        if ($raw -match '^[rR]$') {
            Write-Host "`n 🔄 _menu.txt を再読み込みしています..." -ForegroundColor Cyan
            $menu = Load-Menu # メニューを再取得して上書き
            Start-Sleep -Seconds 1
            continue
        }

        # ②-2 ToDo画面へ (NEW)
        if ($raw -match '^[tT]$') {
            Invoke-TodoManager
            continue
        }

        # ③ 空入力は再表示
        if ([string]::IsNullOrWhiteSpace($raw)) { continue }

        # ④ 数字判定と起動
        if ($raw -as [int]) {
            $num = [int]$raw
            $selected = $menu | Where-Object { $_.No -eq $num }

            if ($selected) {
                $target = $selected.Target
                $arguments = $selected.Arguments
                Write-Host "`n 🚀 [$($selected.No)] $($selected.Name) を開いています..." -ForegroundColor Cyan
                if ($arguments) {
                    Write-Host " 💨 $target $arguments"
                } else {
                    Write-Host " 💨 $target"
                }

                try {
                    if ($target -match '^https?://') {
                        Start-Process $target
                    } elseif ($arguments) {
                        # 実行ファイル + 引数 を指定して起動
                        Start-Process -FilePath $target -ArgumentList $arguments
                    } else {
                        Start-Process -FilePath $target
                    }
                } catch {
                    Write-Host "`n [エラー] 起動に失敗しました: $($_.Exception.Message)" -ForegroundColor Red
                }

                Start-Sleep -Seconds 3.0
                # Read-Host "`n 続けるには Enter を押してください"
            } else {
                Write-Host "`n [エラー] 番号 $num はメニューにありません。" -ForegroundColor Red
                Start-Sleep -Seconds 1.5
            }
        } else {
            Write-Host "`n [エラー] 数字を入力してください。" -ForegroundColor Red
            Start-Sleep -Seconds 1.5
        }
    }
}

# -------------------------------------------------
# メイン処理開始
# -------------------------------------------------
Invoke-Selection
