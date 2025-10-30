"""
Email Service for FitTrack Pro
SMTP email sending with templating support
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import List, Optional
from pathlib import Path
from jinja2 import Template


class EmailService:
    """Email service for sending workout plans, meal plans, and reports"""
    
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_user)
        self.from_name = os.getenv("FROM_NAME", "FitTrack Pro")
        
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        attachments: Optional[List[tuple]] = None
    ) -> bool:
        """
        Send an email with optional attachments
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_body: HTML email body
            text_body: Plain text fallback (optional)
            attachments: List of (filename, file_bytes) tuples
            
        Returns:
            True if email sent successfully, False otherwise
        """
        if not self.smtp_user or not self.smtp_password:
            print("SMTP credentials not configured")
            return False
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            
            # Add text and HTML parts
            if text_body:
                msg.attach(MIMEText(text_body, 'plain'))
            msg.attach(MIMEText(html_body, 'html'))
            
            # Add attachments
            if attachments:
                for filename, file_bytes in attachments:
                    part = MIMEApplication(file_bytes, Name=filename)
                    part['Content-Disposition'] = f'attachment; filename="{filename}"'
                    msg.attach(part)
            
            # Connect and send
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            return True
            
        except Exception as e:
            print(f"Failed to send email: {e}")
            return False
    
    def send_workout_plan(
        self,
        to_email: str,
        client_name: str,
        trainer_name: str,
        workout_title: str,
        scheduled_date: str,
        pdf_bytes: bytes
    ) -> bool:
        """Send workout plan email with PDF attachment"""
        html = get_workout_plan_template().render(
            client_name=client_name,
            trainer_name=trainer_name,
            workout_title=workout_title,
            scheduled_date=scheduled_date
        )
        
        text = f"""
Hello {client_name},

Your trainer {trainer_name} has created a new workout plan for you:

{workout_title}
Scheduled for: {scheduled_date}

Please see the attached PDF for full workout details.

Best regards,
FitTrack Pro Team
        """
        
        return self.send_email(
            to_email=to_email,
            subject=f"New Workout Plan: {workout_title}",
            html_body=html,
            text_body=text,
            attachments=[("workout_plan.pdf", pdf_bytes)]
        )
    
    def send_meal_plan(
        self,
        to_email: str,
        client_name: str,
        trainer_name: str,
        days: int,
        pdf_bytes: bytes
    ) -> bool:
        """Send meal plan email with PDF attachment"""
        html = get_meal_plan_template().render(
            client_name=client_name,
            trainer_name=trainer_name,
            days=days
        )
        
        text = f"""
Hello {client_name},

Your trainer {trainer_name} has created a {days}-day meal plan for you.

Please see the attached PDF for your complete meal plan with nutrition details.

Best regards,
FitTrack Pro Team
        """
        
        return self.send_email(
            to_email=to_email,
            subject=f"Your {days}-Day Meal Plan",
            html_body=html,
            text_body=text,
            attachments=[("meal_plan.pdf", pdf_bytes)]
        )
    
    def send_progress_report(
        self,
        to_email: str,
        client_name: str,
        trainer_name: str,
        days: int,
        pdf_bytes: bytes
    ) -> bool:
        """Send progress report email with PDF attachment"""
        html = get_progress_report_template().render(
            client_name=client_name,
            trainer_name=trainer_name,
            days=days
        )
        
        text = f"""
Hello {client_name},

Your {days}-day progress report from {trainer_name} is ready!

The attached PDF contains:
- Measurement history and changes
- Achievements unlocked
- Active quests progress
- Milestones reached

Keep up the great work!

Best regards,
FitTrack Pro Team
        """
        
        return self.send_email(
            to_email=to_email,
            subject=f"Your {days}-Day Progress Report",
            html_body=html,
            text_body=text,
            attachments=[("progress_report.pdf", pdf_bytes)]
        )
    
    def send_health_stats(
        self,
        to_email: str,
        client_name: str,
        trainer_name: str,
        days: int,
        pdf_bytes: bytes
    ) -> bool:
        """Send health statistics email with PDF attachment"""
        html = get_health_stats_template().render(
            client_name=client_name,
            trainer_name=trainer_name,
            days=days
        )
        
        text = f"""
Hello {client_name},

Your {days}-day health statistics report is attached.

This comprehensive report includes:
- Nutrition summary
- Workout statistics
- Body composition trends
- Progress insights

Review your stats and keep pushing forward!

Best regards,
FitTrack Pro Team
        """
        
        return self.send_email(
            to_email=to_email,
            subject=f"Your {days}-Day Health Statistics",
            html_body=html,
            text_body=text,
            attachments=[("health_stats.pdf", pdf_bytes)]
        )


def get_workout_plan_template() -> Template:
    """Get workout plan email template"""
    return Template("""
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FF4B39 0%, #FFB82B 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #1BB55C; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏋️ New Workout Plan</h1>
        </div>
        <div class="content">
            <h2>Hello {{ client_name }}! 👋</h2>
            <p>Your trainer <strong>{{ trainer_name }}</strong> has created a new workout plan for you:</p>
            
            <div style="background: white; padding: 20px; border-left: 4px solid #FF4B39; margin: 20px 0;">
                <h3 style="margin-top: 0;">{{ workout_title }}</h3>
                <p><strong>Scheduled for:</strong> {{ scheduled_date }}</p>
            </div>
            
            <p>Your complete workout plan is attached as a PDF. Review the exercises, sets, and reps to prepare for your session!</p>
            
            <p><strong>Tips for success:</strong></p>
            <ul>
                <li>Review the workout before you start</li>
                <li>Warm up properly</li>
                <li>Focus on form over weight</li>
                <li>Track your sets in real-time</li>
                <li>Cool down and stretch</li>
            </ul>
            
            <p>Ready to crush this workout? Let's go! 💪</p>
        </div>
        <div class="footer">
            <p>FitTrack Pro - Your Fitness Journey, Our Priority</p>
            <p>This email was sent by {{ trainer_name }}</p>
        </div>
    </div>
</body>
</html>
    """)


def get_meal_plan_template() -> Template:
    """Get meal plan email template"""
    return Template("""
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1BB55C 0%, #FFB82B 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍎 Your Meal Plan is Ready!</h1>
        </div>
        <div class="content">
            <h2>Hello {{ client_name }}! 👋</h2>
            <p>Your trainer <strong>{{ trainer_name }}</strong> has prepared a <strong>{{ days }}-day meal plan</strong> customized for your goals!</p>
            
            <div style="background: white; padding: 20px; border-left: 4px solid #1BB55C; margin: 20px 0;">
                <h3 style="margin-top: 0;">What's Included</h3>
                <ul>
                    <li>Complete meal breakdown for {{ days }} days</li>
                    <li>Detailed nutrition information</li>
                    <li>Calorie and macro tracking</li>
                    <li>Easy-to-follow meal schedule</li>
                </ul>
            </div>
            
            <p><strong>Nutrition Tips:</strong></p>
            <ul>
                <li>Prep meals in advance when possible</li>
                <li>Stay hydrated throughout the day</li>
                <li>Listen to your body's hunger cues</li>
                <li>Track your meals for best results</li>
            </ul>
            
            <p>Fuel your body right and watch the results follow! 🔥</p>
        </div>
        <div class="footer">
            <p>FitTrack Pro - Your Fitness Journey, Our Priority</p>
            <p>This email was sent by {{ trainer_name }}</p>
        </div>
    </div>
</body>
</html>
    """)


def get_progress_report_template() -> Template:
    """Get progress report email template"""
    return Template("""
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FFB82B 0%, #FF4B39 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Your Progress Report</h1>
        </div>
        <div class="content">
            <h2>Hello {{ client_name }}! 👋</h2>
            <p>Great news! Your <strong>{{ days }}-day progress report</strong> from {{ trainer_name }} is ready!</p>
            
            <div style="background: white; padding: 20px; border-left: 4px solid #FFB82B; margin: 20px 0;">
                <h3 style="margin-top: 0;">Report Highlights</h3>
                <ul>
                    <li>📏 Measurement history and changes</li>
                    <li>🏆 Achievements unlocked</li>
                    <li>🎯 Active quests progress</li>
                    <li>⭐ Milestones reached</li>
                </ul>
            </div>
            
            <p>Review your progress and celebrate your wins! Every step forward counts.</p>
            
            <p><strong>Remember:</strong> Progress isn't always linear, but consistency is key. Keep showing up, keep working hard, and the results will follow.</p>
            
            <p>Proud of your progress! Keep it up! 💪✨</p>
        </div>
        <div class="footer">
            <p>FitTrack Pro - Your Fitness Journey, Our Priority</p>
            <p>This email was sent by {{ trainer_name }}</p>
        </div>
    </div>
</body>
</html>
    """)


def get_health_stats_template() -> Template:
    """Get health statistics email template"""
    return Template("""
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📈 Health Statistics Report</h1>
        </div>
        <div class="content">
            <h2>Hello {{ client_name }}! 👋</h2>
            <p>Your comprehensive <strong>{{ days }}-day health statistics</strong> are ready for review!</p>
            
            <div style="background: white; padding: 20px; border-left: 4px solid #2575fc; margin: 20px 0;">
                <h3 style="margin-top: 0;">What's Inside</h3>
                <ul>
                    <li>🍽️ Nutrition summary and averages</li>
                    <li>💪 Workout statistics and volume</li>
                    <li>📊 Body composition trends</li>
                    <li>🎯 Progress insights</li>
                </ul>
            </div>
            
            <p>Use these insights to understand your patterns and optimize your routine!</p>
            
            <p><strong>Data-Driven Tips:</strong></p>
            <ul>
                <li>Review trends, not just individual data points</li>
                <li>Identify what's working and double down</li>
                <li>Adjust strategies based on results</li>
                <li>Share insights with your trainer</li>
            </ul>
            
            <p>Knowledge is power - use your data to level up! 🚀</p>
        </div>
        <div class="footer">
            <p>FitTrack Pro - Your Fitness Journey, Our Priority</p>
            <p>This email was sent by {{ trainer_name }}</p>
        </div>
    </div>
</body>
</html>
    """)
