"""
PDF Generation System for FitTrack Pro
Generates professional PDF reports for workouts, meal plans, progress reports, and health statistics
"""
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.linecharts import HorizontalLineChart
from reportlab.graphics.charts.barcharts import VerticalBarChart
from datetime import datetime
from io import BytesIO
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Use non-GUI backend

from typing import List, Dict, Optional
from .models import Client, Measurement, Meal, Workout, Achievement, Quest, Milestone


class PDFGenerator:
    """Base PDF generator with common styling"""
    
    def __init__(self, title: str, author: str = "FitTrack Pro"):
        self.buffer = BytesIO()
        self.doc = SimpleDocTemplate(
            self.buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        self.title = title
        self.author = author
        self.story = []
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Create custom paragraph styles"""
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#FF4B39'),
            spaceAfter=30,
            alignment=TA_CENTER
        ))
        
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#1BB55C'),
            spaceBefore=20,
            spaceAfter=10
        ))
        
        self.styles.add(ParagraphStyle(
            name='SubHeader',
            parent=self.styles['Heading3'],
            fontSize=12,
            textColor=colors.HexColor('#FFB82B'),
            spaceBefore=10,
            spaceAfter=6
        ))
    
    def add_title(self, text: str):
        """Add main title"""
        self.story.append(Paragraph(text, self.styles['CustomTitle']))
        self.story.append(Spacer(1, 0.2*inch))
    
    def add_section_header(self, text: str):
        """Add section header"""
        self.story.append(Paragraph(text, self.styles['SectionHeader']))
    
    def add_paragraph(self, text: str):
        """Add normal paragraph"""
        self.story.append(Paragraph(text, self.styles['Normal']))
        self.story.append(Spacer(1, 0.1*inch))
    
    def add_table(self, data: List[List], col_widths: Optional[List] = None):
        """Add a styled table"""
        table = Table(data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0f0f0')])
        ]))
        self.story.append(table)
        self.story.append(Spacer(1, 0.2*inch))
    
    def build(self) -> BytesIO:
        """Build the PDF and return buffer"""
        self.doc.build(self.story)
        self.buffer.seek(0)
        return self.buffer


class WorkoutPDFGenerator(PDFGenerator):
    """Generate workout log PDF"""
    
    def generate(self, workout: Workout, client: Client):
        """Generate workout PDF"""
        self.add_title(f"Workout Log: {workout.title}")
        
        # Client info
        self.add_paragraph(f"<b>Client:</b> {client.name}")
        self.add_paragraph(f"<b>Date:</b> {workout.completed_at.strftime('%B %d, %Y') if workout.completed_at else 'Scheduled'}")
        if workout.duration_minutes:
            self.add_paragraph(f"<b>Duration:</b> {workout.duration_minutes} minutes")
        
        if workout.notes:
            self.add_section_header("Notes")
            self.add_paragraph(workout.notes)
        
        # Exercises table
        self.add_section_header("Exercises")
        
        for setgroup in workout.setgroups:
            self.add_paragraph(f"<b>{setgroup.exercise.name}</b> ({setgroup.exercise.category or 'General'})")
            
            if setgroup.notes:
                self.add_paragraph(f"<i>{setgroup.notes}</i>")
            
            # Sets table
            sets_data = [["Set", "Reps", "Weight (kg)", "RPE", "Volume (kg)"]]
            for s in setgroup.sets:
                sets_data.append([
                    str(s.set_number),
                    str(s.reps) if s.reps else "-",
                    str(s.weight) if s.weight else "-",
                    str(s.rpe) if s.rpe else "-",
                    f"{s.volume:.1f}" if s.volume else "-"
                ])
            
            self.add_table(sets_data, col_widths=[inch, inch, 1.2*inch, inch, 1.2*inch])
            
            # Setgroup summary
            total_volume = setgroup.total_volume
            self.add_paragraph(f"<b>Total Volume:</b> {total_volume:.1f} kg")
            self.story.append(Spacer(1, 0.3*inch))
        
        # Workout summary
        self.add_section_header("Workout Summary")
        summary_data = [
            ["Total Exercises", str(len(workout.setgroups))],
            ["Total Volume", f"{workout.total_volume:.1f} kg"],
            ["Duration", f"{workout.duration_minutes} min" if workout.duration_minutes else "N/A"]
        ]
        self.add_table(summary_data, col_widths=[2*inch, 2*inch])
        
        return self.build()


class MealPlanPDFGenerator(PDFGenerator):
    """Generate meal plan PDF"""
    
    def generate(self, meals: List[Meal], client: Client, days: int = 7):
        """Generate meal plan PDF"""
        self.add_title(f"{days}-Day Meal Plan")
        self.add_paragraph(f"<b>Client:</b> {client.name}")
        self.add_paragraph(f"<b>Generated:</b> {datetime.now().strftime('%B %d, %Y')}")
        
        # Group meals by date
        meals_by_date = {}
        for meal in sorted(meals, key=lambda m: m.date):
            date_key = meal.date.strftime('%Y-%m-%d')
            if date_key not in meals_by_date:
                meals_by_date[date_key] = []
            meals_by_date[date_key].append(meal)
        
        # Generate meal tables for each day
        for date_str, day_meals in meals_by_date.items():
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            self.add_section_header(date_obj.strftime('%A, %B %d'))
            
            for meal in day_meals:
                self.add_paragraph(f"<b>{meal.name}</b>")
                
                if meal.notes:
                    self.add_paragraph(f"<i>{meal.notes}</i>")
                
                # Meal items table
                if meal.items:
                    items_data = [["Food", "Quantity", "Calories", "Protein (g)", "Carbs (g)", "Fat (g)"]]
                    for item in meal.items:
                        items_data.append([
                            item.name,
                            f"{item.quantity} {item.unit or ''}",
                            f"{item.calories:.0f}" if item.calories else "-",
                            f"{item.protein:.1f}" if item.protein else "-",
                            f"{item.carbs:.1f}" if item.carbs else "-",
                            f"{item.fat:.1f}" if item.fat else "-"
                        ])
                    
                    self.add_table(items_data)
                
                # Meal totals
                if meal.total_nutrients:
                    totals = meal.total_nutrients
                    self.add_paragraph(
                        f"<b>Totals:</b> {totals.get('calories', 0):.0f} cal | "
                        f"P: {totals.get('protein', 0):.1f}g | "
                        f"C: {totals.get('carbs', 0):.1f}g | "
                        f"F: {totals.get('fat', 0):.1f}g"
                    )
                
                self.story.append(Spacer(1, 0.2*inch))
        
        return self.build()


class ProgressReportPDFGenerator(PDFGenerator):
    """Generate comprehensive progress report PDF"""
    
    def generate(self, client: Client, measurements: List[Measurement], 
                 achievements: List[Achievement], quests: List[Quest], 
                 milestones: List[Milestone]):
        """Generate progress report PDF"""
        self.add_title(f"Progress Report: {client.name}")
        self.add_paragraph(f"<b>Generated:</b> {datetime.now().strftime('%B %d, %Y')}")
        
        # Summary section
        self.add_section_header("Summary")
        if measurements:
            latest = measurements[0]
            oldest = measurements[-1]
            
            weight_change = (latest.weight - oldest.weight) if latest.weight and oldest.weight else 0
            bf_change = (latest.body_fat - oldest.body_fat) if latest.body_fat and oldest.body_fat else 0
            
            summary_data = [
                ["Metric", "Current", "Starting", "Change"],
                ["Weight (kg)", f"{latest.weight:.1f}" if latest.weight else "-", 
                 f"{oldest.weight:.1f}" if oldest.weight else "-", 
                 f"{weight_change:+.1f}"],
                ["Body Fat (%)", f"{latest.body_fat:.1f}" if latest.body_fat else "-",
                 f"{oldest.body_fat:.1f}" if oldest.body_fat else "-",
                 f"{bf_change:+.1f}"],
            ]
            self.add_table(summary_data)
        
        # Measurements section
        if measurements:
            self.add_section_header("Measurements History")
            meas_data = [["Date", "Weight (kg)", "Body Fat (%)", "Waist (cm)", "Chest (cm)"]]
            for m in measurements[:10]:  # Last 10 measurements
                meas_data.append([
                    m.date.strftime('%Y-%m-%d'),
                    f"{m.weight:.1f}" if m.weight else "-",
                    f"{m.body_fat:.1f}" if m.body_fat else "-",
                    f"{m.waist:.1f}" if m.waist else "-",
                    f"{m.chest:.1f}" if m.chest else "-"
                ])
            self.add_table(meas_data)
        
        # Achievements section
        if achievements:
            self.add_section_header("Achievements Unlocked")
            ach_data = [["Achievement", "Category", "Date"]]
            for a in achievements:
                ach_data.append([
                    f"{a.icon or '🏆'} {a.name}",
                    a.category or "General",
                    a.awarded_at.strftime('%Y-%m-%d')
                ])
            self.add_table(ach_data)
        
        # Active quests section
        if quests:
            self.add_section_header("Active Quests")
            quest_data = [["Quest", "Progress", "Difficulty", "Deadline"]]
            for q in quests:
                progress = f"{q.current_value}/{q.target_value} {q.target_unit}" if q.current_value and q.target_value else "N/A"
                deadline = q.deadline.strftime('%Y-%m-%d') if q.deadline else "No deadline"
                quest_data.append([
                    q.title,
                    progress,
                    q.difficulty.title(),
                    deadline
                ])
            self.add_table(quest_data)
        
        # Milestones section
        if milestones:
            self.add_section_header("Milestones Achieved")
            mile_data = [["Milestone", "Value", "Date"]]
            for m in milestones:
                value_str = f"{m.value} {m.unit}" if m.value and m.unit else ""
                mile_data.append([
                    m.title,
                    value_str,
                    m.achieved_at.strftime('%Y-%m-%d')
                ])
            self.add_table(mile_data)
        
        return self.build()


class HealthStatsPDFGenerator(PDFGenerator):
    """Generate health statistics PDF with charts"""
    
    def generate(self, client: Client, measurements: List[Measurement], 
                 meals: List[Meal], workouts: List[Workout]):
        """Generate health statistics PDF"""
        self.add_title(f"Health Statistics: {client.name}")
        self.add_paragraph(f"<b>Report Period:</b> Last 30 Days")
        self.add_paragraph(f"<b>Generated:</b> {datetime.now().strftime('%B %d, %Y')}")
        
        # Nutrition summary
        if meals:
            self.add_section_header("Nutrition Summary")
            total_meals = len(meals)
            avg_calories = sum([m.total_nutrients.get('calories', 0) for m in meals if m.total_nutrients]) / total_meals if total_meals > 0 else 0
            avg_protein = sum([m.total_nutrients.get('protein', 0) for m in meals if m.total_nutrients]) / total_meals if total_meals > 0 else 0
            
            nutrition_data = [
                ["Metric", "Value"],
                ["Total Meals Logged", str(total_meals)],
                ["Avg Calories/Meal", f"{avg_calories:.0f}"],
                ["Avg Protein/Meal", f"{avg_protein:.1f}g"]
            ]
            self.add_table(nutrition_data, col_widths=[3*inch, 2*inch])
        
        # Workout summary
        if workouts:
            self.add_section_header("Workout Summary")
            completed = [w for w in workouts if w.completed]
            total_volume = sum([w.total_volume for w in completed])
            avg_duration = sum([w.duration_minutes for w in completed if w.duration_minutes]) / len(completed) if completed else 0
            
            workout_data = [
                ["Metric", "Value"],
                ["Total Workouts", str(len(workouts))],
                ["Completed Workouts", str(len(completed))],
                ["Total Volume", f"{total_volume:.0f} kg"],
                ["Avg Duration", f"{avg_duration:.0f} min"]
            ]
            self.add_table(workout_data, col_widths=[3*inch, 2*inch])
        
        # Body composition
        if measurements:
            self.add_section_header("Body Composition")
            latest = measurements[0]
            comp_data = [
                ["Measurement", "Current"],
                ["Weight", f"{latest.weight:.1f} kg" if latest.weight else "-"],
                ["Body Fat %", f"{latest.body_fat:.1f}%" if latest.body_fat else "-"],
                ["Waist", f"{latest.waist:.1f} cm" if latest.waist else "-"],
                ["Chest", f"{latest.chest:.1f} cm" if latest.chest else "-"],
                ["Hips", f"{latest.hips:.1f} cm" if latest.hips else "-"]
            ]
            self.add_table(comp_data, col_widths=[3*inch, 2*inch])
        
        return self.build()


def generate_workout_pdf(workout: Workout, client: Client) -> BytesIO:
    """Helper function to generate workout PDF"""
    generator = WorkoutPDFGenerator(f"Workout: {workout.title}", "FitTrack Pro")
    return generator.generate(workout, client)


def generate_meal_plan_pdf(meals: List[Meal], client: Client, days: int = 7) -> BytesIO:
    """Helper function to generate meal plan PDF"""
    generator = MealPlanPDFGenerator(f"{days}-Day Meal Plan", "FitTrack Pro")
    return generator.generate(meals, client, days)


def generate_progress_report_pdf(client: Client, measurements: List[Measurement],
                                 achievements: List[Achievement], quests: List[Quest],
                                 milestones: List[Milestone]) -> BytesIO:
    """Helper function to generate progress report PDF"""
    generator = ProgressReportPDFGenerator(f"Progress Report: {client.name}", "FitTrack Pro")
    return generator.generate(client, measurements, achievements, quests, milestones)


def generate_health_stats_pdf(client: Client, measurements: List[Measurement],
                              meals: List[Meal], workouts: List[Workout]) -> BytesIO:
    """Helper function to generate health statistics PDF"""
    generator = HealthStatsPDFGenerator(f"Health Stats: {client.name}", "FitTrack Pro")
    return generator.generate(client, measurements, meals, workouts)
