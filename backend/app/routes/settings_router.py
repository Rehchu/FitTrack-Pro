"""
Settings Router - Email configuration endpoints
Allows trainers to configure SMTP settings for sending emails
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
from dotenv import load_dotenv, set_key
from pathlib import Path
from ..email_service import EmailService

router = APIRouter(prefix="/settings", tags=["settings"])

class EmailConfig(BaseModel):
    smtp_host: str
    smtp_port: str
    smtp_user: str
    smtp_password: str
    from_email: str
    from_name: str

class TestEmailRequest(BaseModel):
    to_email: str
    smtp_host: str
    smtp_port: str
    smtp_user: str
    smtp_password: str
    from_email: str
    from_name: str


@router.get("/email")
async def get_email_settings():
    """Get current email settings (password excluded for security)"""
    return {
        "smtp_host": os.getenv("SMTP_HOST", "smtp.gmail.com"),
        "smtp_port": os.getenv("SMTP_PORT", "587"),
        "smtp_user": os.getenv("SMTP_USER", ""),
        "from_email": os.getenv("FROM_EMAIL", ""),
        "from_name": os.getenv("FROM_NAME", "FitTrack Pro")
    }


@router.post("/email")
async def save_email_settings(config: EmailConfig):
    """Save email settings to .env file"""
    try:
        # Find .env file
        env_path = Path(__file__).parent.parent.parent / ".env"
        
        if not env_path.exists():
            # Create .env if it doesn't exist
            with open(env_path, 'w') as f:
                f.write("# Email Configuration\n")
        
        # Update .env file
        set_key(str(env_path), "SMTP_HOST", config.smtp_host)
        set_key(str(env_path), "SMTP_PORT", config.smtp_port)
        set_key(str(env_path), "SMTP_USER", config.smtp_user)
        set_key(str(env_path), "SMTP_PASSWORD", config.smtp_password)
        set_key(str(env_path), "FROM_EMAIL", config.from_email)
        set_key(str(env_path), "FROM_NAME", config.from_name)
        
        # Reload environment variables
        load_dotenv(str(env_path), override=True)
        
        return {"success": True, "message": "Email settings saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save settings: {str(e)}")


@router.post("/email/test")
async def test_email_settings(request: TestEmailRequest):
    """Test email configuration by sending a test email"""
    try:
        # Temporarily override env vars for test
        original_env = {
            "SMTP_HOST": os.getenv("SMTP_HOST"),
            "SMTP_PORT": os.getenv("SMTP_PORT"),
            "SMTP_USER": os.getenv("SMTP_USER"),
            "SMTP_PASSWORD": os.getenv("SMTP_PASSWORD"),
            "FROM_EMAIL": os.getenv("FROM_EMAIL"),
            "FROM_NAME": os.getenv("FROM_NAME"),
        }
        
        os.environ["SMTP_HOST"] = request.smtp_host
        os.environ["SMTP_PORT"] = request.smtp_port
        os.environ["SMTP_USER"] = request.smtp_user
        os.environ["SMTP_PASSWORD"] = request.smtp_password
        os.environ["FROM_EMAIL"] = request.from_email
        os.environ["FROM_NAME"] = request.from_name
        
        # Create email service with test config
        email_service = EmailService()
        
        # Send test email
        html_body = """
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #1BB55C;">✅ FitTrack Pro Email Test</h2>
            <p>Congratulations! Your email settings are working correctly.</p>
            <p>You can now send workout plans, meal plans, and progress reports to your clients.</p>
            <hr style="border: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
                This is a test email from FitTrack Pro.<br>
                If you received this, your SMTP configuration is correct.
            </p>
        </body>
        </html>
        """
        
        text_body = "FitTrack Pro Email Test - Your email settings are working correctly!"
        
        success = email_service.send_email(
            to_email=request.to_email,
            subject="✅ FitTrack Pro Email Test",
            html_body=html_body,
            text_body=text_body
        )
        
        # Restore original environment
        for key, value in original_env.items():
            if value is not None:
                os.environ[key] = value
        
        if success:
            return {"success": True, "message": f"Test email sent to {request.to_email}"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send test email. Check your SMTP settings.")
            
    except Exception as e:
        # Restore original environment on error
        for key, value in original_env.items():
            if value is not None:
                os.environ[key] = value
        raise HTTPException(status_code=500, detail=f"Email test failed: {str(e)}")
