import React, { useEffect, useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { EventClickArg } from '@fullcalendar/core';
import listPlugin from '@fullcalendar/list';
import { Box, Card, CardContent, Typography, useTheme } from '@mui/material';
import { useAuthStore } from '../../stores/authStore';

// Note: FullCalendar v6 no longer ships CSS in packages by default.
// We rely on MUI theme styling and FullCalendar's inline styles here.

type CalendarEvent = {
  id: string;
  title: string;
  start: string; // ISO
  end?: string; // ISO
  allDay?: boolean;
  color?: string;
  extendedProps?: Record<string, any>;
};

export function CalendarView() {
  const theme = useTheme();
  const { token } = useAuthStore();
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Fetch workouts and map to calendar events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/workouts?limit=500', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error('Failed to load workouts');
        const workouts = await res.json();
        const mapped: CalendarEvent[] = workouts.map((w: any) => ({
          id: String(w.id),
          title: w.title || 'Workout Session',
          start: w.scheduled_at || w.completed_at || w.timestamp,
          color: w.completed ? theme.palette.success.main : theme.palette.primary.main,
          extendedProps: {
            client_id: w.client_id,
            trainer_id: w.trainer_id,
            completed: w.completed,
            completed_at: w.completed_at,
            description: w.description,
          },
        }));
        setEvents(mapped);
      } catch (e) {
        // Fallback demo events
        setEvents([
          {
            id: 'demo-1',
            title: 'Demo: Upper Body Strength',
            start: new Date().toISOString(),
            color: theme.palette.primary.main,
          },
        ]);
      }
    };
    fetchEvents();
  }, [token, theme.palette.primary.main]);

  const headerToolbar = useMemo(
    () => ({
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
    }),
    []
  );

  const handleDateClick = (arg: DateClickArg) => {
    // Placeholder: open a modal to schedule a new workout for this date
    // eslint-disable-next-line no-alert
    alert(`Schedule a new session on ${arg.dateStr}`);
  };

  const handleEventClick = (arg: EventClickArg) => {
    const w = arg.event.extendedProps as any;
    // Placeholder: show a quick details dialog
    // eslint-disable-next-line no-alert
    alert(`${arg.event.title}\nClient: ${w?.client_id ?? 'N/A'}\nCompleted: ${w?.completed ? 'Yes' : 'No'}`);
  };

  return (
    <Box p={2} id="calendar-container">
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Schedule
          </Typography>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView="dayGridMonth"
            headerToolbar={headerToolbar}
            height="auto"
            weekends
            editable
            selectable
            events={events}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            eventColor={theme.palette.primary.main}
            themeSystem="standard"
          />
        </CardContent>
      </Card>
    </Box>
  );
}
