; FitTrack Pro Installer Script
; Creates a complete installation package with Python, backend, and desktop app

#define MyAppName "FitTrack Pro"
#define MyAppVersion "1.2.0"
#define MyAppPublisher "FitTrack Pro Team"
#define MyAppURL "https://fittrackpro.com"
#define MyAppExeName "FitTrack Pro.bat"

[Setup]
AppId={{8F9A7B6C-5D4E-3A2B-1C9F-8E7D6A5B4C3D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
LicenseFile=..\LICENSE.txt
OutputDir=E:\FitTrack Pro 1.1\installer\output
OutputBaseFilename=FitTrackPro-Setup-{#MyAppVersion}
SetupIconFile=..\desktop-app\build\icon.ico
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=admin
UninstallDisplayIcon={app}\desktop-app\FitTrack Pro.exe

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Python embedded runtime
Source: "E:\FitTrack Pro 1.1\installer\build\python\*"; DestDir: "{app}\python"; Flags: ignoreversion recursesubdirs createallsubdirs

; Backend application
Source: "E:\FitTrack Pro 1.1\installer\build\backend\*"; DestDir: "{app}\backend"; Flags: ignoreversion recursesubdirs createallsubdirs

; Desktop application
Source: "E:\FitTrack Pro 1.1\installer\build\desktop-app\*"; DestDir: "{app}\desktop-app"; Flags: ignoreversion recursesubdirs createallsubdirs

; Cloudflared (optional)
Source: "E:\FitTrack Pro 1.1\installer\build\cloudflared.exe"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

; Launcher script
Source: "E:\FitTrack Pro 1.1\installer\build\FitTrack Pro.bat"; DestDir: "{app}"; Flags: ignoreversion

; Documentation
Source: "..\README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\docs\*"; DestDir: "{app}\docs"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
procedure InitializeWizard;
begin
  WizardForm.WelcomeLabel2.Caption := 
    'This will install FitTrack Pro on your computer.' + #13#10 + #13#10 +
    'FitTrack Pro is a complete personal training platform with:' + #13#10 +
    '  • Client management and progress tracking' + #13#10 +
    '  • Workout and meal planning' + #13#10 +
    '  • PDF reports and email integration' + #13#10 +
    '  • Video calls and messaging' + #13#10 +
    '  • Achievement system and gamification' + #13#10 + #13#10 +
    'No additional software required - everything is included!';
end;
