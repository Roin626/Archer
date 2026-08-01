param(
  [switch]$NoOpen,
  [switch]$SmokeTest
)

$ErrorActionPreference = "Stop"

function Get-RepoRoot {
  $scriptDir = Split-Path -Parent $PSCommandPath
  return (Resolve-Path (Join-Path $scriptDir "..")).Path
}

function Find-Python {
  $commands = @("py", "python")
  foreach ($command in $commands) {
    $found = Get-Command $command -ErrorAction SilentlyContinue
    if ($found) {
      return $command
    }
  }
  return $null
}

function Invoke-Python {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PythonCommand,
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  if ($PythonCommand -eq "py") {
    & py -3 @Arguments
    return
  }
  & $PythonCommand @Arguments
}

function Open-Recorder {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Root
  )

  $indexPath = Join-Path $Root "index.html"
  if (-not (Test-Path $indexPath)) {
    throw "Cannot find index.html at $indexPath"
  }
  Start-Process $indexPath
}

function Read-WithDefault {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Prompt,
    [Parameter(Mandatory = $true)]
    [AllowEmptyString()]
    [string]$Default
  )

  $value = Read-Host "$Prompt [$Default]"
  if ([string]::IsNullOrWhiteSpace($value)) {
    return $Default
  }
  return $value
}

function Read-ChoiceWithDefault {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Prompt,
    [Parameter(Mandatory = $true)]
    [string]$Default,
    [Parameter(Mandatory = $true)]
    [string[]]$Choices,
    [hashtable]$Aliases = @{}
  )

  while ($true) {
    $value = Read-WithDefault $Prompt $Default
    $normalized = $value.Trim().ToLowerInvariant()
    if ($Aliases.ContainsKey($normalized)) {
      $normalized = $Aliases[$normalized]
      Write-Host "Using '$normalized'."
    }
    if ($Choices -contains $normalized) {
      return $normalized
    }
    Write-Host "Invalid value '$value'. Choose one of: $($Choices -join ', ')"
  }
}

function Run-EquipmentMatrix {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Root,
    [Parameter(Mandatory = $true)]
    [string]$PythonCommand
  )

  $bowChoices = @("olympic_recurve", "barebow", "compound", "american_hunting", "shelfless_traditional")
  $bowAliases = @{
    american = "american_hunting";
    american_hunter = "american_hunting";
    chinese = "shelfless_traditional";
    chinese_traditional = "shelfless_traditional";
    mongol = "shelfless_traditional";
    mongolian = "shelfless_traditional";
    mongolian_traditional = "shelfless_traditional";
    recurve = "olympic_recurve";
    olympic = "olympic_recurve";
    trad = "american_hunting";
    traditional = "american_hunting";
    tranditional = "american_hunting";
    shelfless = "shelfless_traditional";
    turkish = "shelfless_traditional";
    turkish_traditional = "shelfless_traditional";
  }
  $bowType = Read-ChoiceWithDefault `
    "Bow type (olympic_recurve, barebow, compound, american_hunting, shelfless_traditional)" `
    "olympic_recurve" `
    $bowChoices `
    $bowAliases
  $drawWeights = Read-WithDefault "Draw weights, comma list or start:stop:step" "26:40:2"
  $drawLengths = Read-WithDefault "AMO draw lengths, comma list or start:stop:step" "26,28,30"
  $arrowPassOffsetMm = Read-WithDefault "Arrow-pass offset from centerline in millimeters; use half grip width for shelfless bows" "0"
  $arguments = @(
    (Join-Path $Root "scripts\equipment_config.py"),
    "--bow-type", $bowType,
    "--draw-weights", $drawWeights,
    "--draw-lengths", $drawLengths,
    "--arrow-pass-offset-mm", $arrowPassOffsetMm
  )
  Invoke-Python $PythonCommand $arguments
}

function Run-SpineCalculator {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Root,
    [Parameter(Mandatory = $true)]
    [string]$PythonCommand
  )

  $bowChoices = @("olympic_recurve", "barebow", "compound", "american_hunting", "shelfless_traditional")
  $bowAliases = @{
    american = "american_hunting";
    american_hunter = "american_hunting";
    chinese = "shelfless_traditional";
    chinese_traditional = "shelfless_traditional";
    mongol = "shelfless_traditional";
    mongolian = "shelfless_traditional";
    mongolian_traditional = "shelfless_traditional";
    recurve = "olympic_recurve";
    olympic = "olympic_recurve";
    trad = "american_hunting";
    traditional = "american_hunting";
    tranditional = "american_hunting";
    shelfless = "shelfless_traditional";
    turkish = "shelfless_traditional";
    turkish_traditional = "shelfless_traditional";
  }
  $bowType = Read-ChoiceWithDefault `
    "Bow type (olympic_recurve, barebow, compound, american_hunting, shelfless_traditional)" `
    "olympic_recurve" `
    $bowChoices `
    $bowAliases
  $mode = Read-ChoiceWithDefault "Calculator (from-weight, from-spine)" "from-weight" @("from-weight", "from-spine")
  $drawWeight = Read-WithDefault "Actual full-draw weight (lb)" "30"
  $shaftLength = Read-WithDefault "Shaft length (nock throat to shaft end, inches)" "30"
  $offset = Read-WithDefault "Arrow-pass offset from centerline (mm)" "0"
  $arguments = @((Join-Path $Root "scripts\spine_estimator.py"), $mode, "--bow-type", $bowType, "--draw-weight", $drawWeight, "--shaft-length", $shaftLength, "--arrow-pass-offset-mm", $offset)
  if ($mode -eq "from-weight") {
    $arguments += @("--finished-arrow-weight", (Read-WithDefault "Finished arrow weight (grains)" "270"))
  } else {
    $arguments += @("--ata-spine", (Read-WithDefault "ATA static spine (for example 700)" "700"))
  }
  Invoke-Python $PythonCommand $arguments
}

function Run-Tests {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PythonCommand
  )

  Invoke-Python $PythonCommand @("-m", "unittest", "discover", "-s", "tests")
}

function Show-Docs {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Root
  )

  Write-Host ""
  Write-Host "Docs:"
  Write-Host "  README:          $(Join-Path $Root "README.md")"
  Write-Host "  Architecture:    $(Join-Path $Root "docs\architecture.md")"
  Write-Host "  SOP:             $(Join-Path $Root "docs\sop.md")"
  Write-Host "  Spine model:     $(Join-Path $Root "docs\spine-model.md")"
  Write-Host "  Equipment model: $(Join-Path $Root "docs\equipment-config.md")"
}

function Show-Menu {
  Write-Host ""
  Write-Host "Archer launcher"
  Write-Host "1. Open landing recorder"
  Write-Host "2. Generate equipment config matrix"
  Write-Host "3. Calculate spine or finished-arrow weight"
  Write-Host "4. Run tests"
  Write-Host "5. Show docs"
  Write-Host "0. Exit"
}

$root = Get-RepoRoot
Set-Location $root
$python = Find-Python

if ($SmokeTest) {
  if (-not (Test-Path (Join-Path $root "index.html"))) {
    throw "index.html missing"
  }
  if (-not (Test-Path (Join-Path $root "scripts\equipment_config.py"))) {
    throw "equipment_config.py missing"
  }
  if (-not $python) {
    throw "Python was not found on PATH"
  }
  Write-Host "Launcher smoke test passed."
  exit 0
}

Write-Host "Project: $root"
if ($python) {
  Write-Host "Python:  $python"
} else {
  Write-Host "Python:  not found; CLI tools and tests are unavailable."
}

if (-not $NoOpen) {
  Open-Recorder $root
  Write-Host "Opened landing recorder."
}

while ($true) {
  Show-Menu
  $choice = Read-Host "Choose"
  switch ($choice) {
    "1" {
      Open-Recorder $root
    }
    "2" {
      if (-not $python) { Write-Host "Python is required."; break }
      Run-EquipmentMatrix $root $python
    }
    "3" {
      if (-not $python) { Write-Host "Python is required."; break }
      Run-SpineCalculator $root $python
    }
    "4" {
      if (-not $python) { Write-Host "Python is required."; break }
      Run-Tests $python
    }
    "5" {
      Show-Docs $root
    }
    "0" {
      exit 0
    }
    default {
      Write-Host "Unknown option."
    }
  }
}
