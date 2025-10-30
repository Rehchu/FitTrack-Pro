# Installer Test Checklist (Windows 10/11)

Manual verification steps for release candidates.

## Pre-req
- Fresh Windows user profile (or VM)
- No prior FitTrack Pro install

## Steps
1. Run the installer
   - Verify no antivirus warnings
   - App installs to Program Files or chosen directory
2. Launch the app
   - Splash/icon show
   - App window opens without errors
3. Onboarding
   - Fill trainer info and complete setup
   - Worker URL appears
   - No crashes or endless spinners
4. Create a client
   - Client appears in list; data persists after restart
5. Share Profile
   - Click Share Profile; URL copies to clipboard
   - Open URL and see public profile
6. Email test (optional)
   - Configure SMTP and send test email with/without attachments
7. Uninstall
   - Uninstaller removes app files
   - App shortcuts removed

## Record
- Windows version (10/11, build)
- Install path
- Any errors/screenshots
