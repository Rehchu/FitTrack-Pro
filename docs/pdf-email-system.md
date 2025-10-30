# PDF Generation & Email System Documentation

## Overview

FitTrack Pro v1.2 includes a comprehensive PDF generation and email system that allows trainers to create and send professional reports to clients.

## Features

### PDF Generation System

Located in `backend/app/pdf_generator.py`, the system provides four types of PDFs:

1. **Workout Log PDF** - Complete workout details with exercises, sets, reps, weights, and volume calculations
2. **Meal Plan PDF** - Multi-day meal plans with nutrition breakdowns and daily totals
3. **Progress Report PDF** - Comprehensive client progress including measurements, achievements, quests, and milestones
4. **Health Statistics PDF** - Aggregated health data with nutrition, workout, and body composition summaries

### Email System

Located in `backend/app/email_service.py`, the system provides:

- SMTP email sending with HTML templates
- Professional email templates for each PDF type
- PDF attachment support
- Customizable branding and styling

## API Endpoints

### PDF Download Endpoints (`/pdf`)

#### GET `/pdf/workout/{workout_id}`

Download workout log PDF

**Response**: PDF file download

#### GET `/pdf/meal-plan/{client_id}?days=7&start_date=2024-01-01`

Download meal plan PDF

**Query Parameters**:

- `days` (optional): Number of days (1-30, default: 7)
- `start_date` (optional): Start date in YYYY-MM-DD format (default: today)

**Response**: PDF file download

#### GET `/pdf/progress-report/{client_id}?days=30`

Download progress report PDF

**Query Parameters**:

- `days` (optional): Number of days to include (7-365, default: 30)

**Response**: PDF file download

#### GET `/pdf/health-stats/{client_id}?days=30`

Download health statistics PDF

**Query Parameters**:

- `days` (optional): Number of days to include (7-365, default: 30)

**Response**: PDF file download

### Email Endpoints (`/email`)

#### POST `/email/send-workout`

Send workout plan email with PDF attachment

**Request Body**:

```json
{
  "workout_id": 123,
  "client_email": "client@example.com"  // Optional override
}
```

**Response**:

```json
{
  "message": "Workout plan email sent successfully",
  "to": "client@example.com"
}
```

#### POST `/email/send-meal-plan`

Send meal plan email with PDF attachment

**Request Body**:

```json
{
  "client_id": 456,
  "days": 7,
  "start_date": "2024-01-01",  // Optional
  "client_email": "client@example.com"  // Optional override
}
```

**Response**:

```json
{
  "message": "7-day meal plan email sent successfully",
  "to": "client@example.com"
}
```

#### POST `/email/send-progress-report`

Send progress report email with PDF attachment

**Request Body**:

```json
{
  "client_id": 456,
  "days": 30,
  "client_email": "client@example.com"  // Optional override
}
```

**Response**:

```json
{
  "message": "30-day progress report email sent successfully",
  "to": "client@example.com"
}
```

#### POST `/email/send-health-stats`

Send health statistics email with PDF attachment

**Request Body**:

```json
{
  "client_id": 456,
  "days": 30,
  "client_email": "client@example.com"  // Optional override
}
```

**Response**:

```json
{
  "message": "30-day health statistics email sent successfully",
  "to": "client@example.com"
}
```

## SMTP Configuration

Add these environment variables to your `.env` file:

```env
# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=FitTrack Pro
```

### Gmail Setup

1. Enable 2-factor authentication on your Google account
2. Generate an App Password: <https://myaccount.google.com/apppasswords>
3. Use the generated password as `SMTP_PASSWORD`

### Other SMTP Providers

**SendGrid**:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

**Mailgun**:

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@yourdomain.mailgun.org
SMTP_PASSWORD=your-mailgun-password
```

**Amazon SES**:

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
```

## PDF Customization

### Custom Styling

Edit the `_setup_custom_styles()` method in `PDFGenerator` class:

```python
self.styles.add(ParagraphStyle(
    name='CustomTitle',
    parent=self.styles['Heading1'],
    fontSize=24,
    textColor=colors.HexColor('#FF4B39'),  # Change colors
    spaceAfter=30,
    alignment=TA_CENTER
))
```

### Custom Tables

Modify table styling in the `add_table()` method:

```python
table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),  # Header background
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),  # Header text
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('GRID', (0, 0), (-1, -1), 1, colors.grey),
]))
```

## Email Template Customization

Email templates are defined in `email_service.py`:

### Custom Branding

Edit the template functions to match your brand:

```python
def get_workout_plan_template() -> Template:
    return Template("""
<!DOCTYPE html>
<html>
<head>
    <style>
        .header { 
            background: linear-gradient(135deg, #YOUR_COLOR 0%, #YOUR_COLOR2 100%); 
        }
    </style>
</head>
<body>
    <!-- Custom HTML content -->
</body>
</html>
    """)
```

### Add Logo

Add your logo to the email header:

```html
<div class="header">
    <img src="https://yourdomain.com/logo.png" alt="Logo" style="max-width: 200px;">
    <h1>🏋️ New Workout Plan</h1>
</div>
```

## Usage Examples

### Frontend Integration

```typescript
// Download workout PDF
async function downloadWorkoutPDF(workoutId: number) {
  const response = await fetch(`/api/pdf/workout/${workoutId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `workout_${workoutId}.pdf`;
  a.click();
}

// Send workout email
async function sendWorkoutEmail(workoutId: number) {
  const response = await fetch('/api/email/send-workout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ workout_id: workoutId })
  });
  
  const result = await response.json();
  console.log(result.message);
}

// Send meal plan email for next 7 days
async function sendMealPlan(clientId: number) {
  const response = await fetch('/api/email/send-meal-plan', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      days: 7
    })
  });
  
  const result = await response.json();
  console.log(result.message);
}
```

### Python Client

```python
import requests

# Download PDF
response = requests.get(
    'http://localhost:8000/pdf/workout/123',
    headers={'Authorization': f'Bearer {token}'}
)

with open('workout.pdf', 'wb') as f:
    f.write(response.content)

# Send email
response = requests.post(
    'http://localhost:8000/email/send-workout',
    headers={'Authorization': f'Bearer {token}'},
    json={'workout_id': 123}
)

print(response.json()['message'])
```

## Testing

### Manual Testing

1. **Install dependencies**:

```bash
pip install -r requirements.txt
```

2. **Configure SMTP** in `.env` file

3. **Start server**:

```bash
cd backend
uvicorn app.main:app --reload
```

4. **Test PDF download**:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/pdf/workout/1 \
  --output workout.pdf
```

5. **Test email sending**:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workout_id": 1}' \
  http://localhost:8000/email/send-workout
```

### Unit Testing

```python
import pytest
from app.pdf_generator import generate_workout_pdf
from app.email_service import EmailService

def test_workout_pdf_generation(db_session):
    workout = db_session.query(Workout).first()
    client = db_session.query(Client).first()
    
    pdf_buffer = generate_workout_pdf(workout, client)
    
    assert pdf_buffer is not None
    assert pdf_buffer.tell() > 0  # PDF has content

def test_email_sending():
    service = EmailService()
    
    success = service.send_email(
        to_email="test@example.com",
        subject="Test Email",
        html_body="<h1>Test</h1>",
        text_body="Test"
    )
    
    assert success is True
```

## Troubleshooting

### PDF Generation Issues

**Problem**: Import errors for reportlab/matplotlib
**Solution**: Install dependencies: `pip install reportlab matplotlib`

**Problem**: PDF content appears blank
**Solution**: Ensure models have data. Check that workout has setgroups, setgroups have sets.

**Problem**: Charts not appearing in PDF
**Solution**: Verify matplotlib backend is set to 'Agg' (non-GUI)

### Email Issues

**Problem**: "Failed to send email" error
**Solution**:

- Verify SMTP credentials in `.env`
- Check firewall/antivirus blocking port 587
- Try port 465 with SSL instead of TLS

**Problem**: Gmail authentication failed
**Solution**:

- Enable 2FA on Google account
- Generate App Password (not regular password)
- Use App Password as SMTP_PASSWORD

**Problem**: Emails going to spam
**Solution**:

- Set up SPF/DKIM records for your domain
- Use a verified sending domain
- Avoid spam trigger words in subject/body

### Performance

**Problem**: PDF generation is slow
**Solution**:

- Limit data ranges (e.g., last 30 days instead of all-time)
- Use pagination for large datasets
- Consider async PDF generation with task queue

**Problem**: Email sending times out
**Solution**:

- Use background task for email sending
- Implement retry logic with exponential backoff
- Consider using a queue system (Celery/Redis)

## Best Practices

1. **Always validate client ownership** before generating PDFs
2. **Limit date ranges** to prevent huge PDFs (max 365 days)
3. **Use background tasks** for email sending in production
4. **Log email sends** for tracking and debugging
5. **Provide text fallback** for HTML emails
6. **Test SMTP configuration** during setup
7. **Use environment variables** for all credentials
8. **Implement rate limiting** on email endpoints
9. **Add email templates** to version control
10. **Monitor email delivery rates** and failures

## Future Enhancements

- [ ] Add chart generation to PDFs (matplotlib integration)
- [ ] Support for custom PDF templates
- [ ] Email scheduling and automation
- [ ] Email campaign tracking
- [ ] Multi-language email templates
- [ ] PDF encryption and password protection
- [ ] Bulk email sending with rate limiting
- [ ] Email open tracking
- [ ] Attachment size optimization
- [ ] Cloud storage integration for large PDFs
