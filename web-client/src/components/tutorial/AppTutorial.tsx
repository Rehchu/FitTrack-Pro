import React from 'react';
import Joyride, { CallBackProps, Step } from 'react-joyride';

export type AppTutorialProps = {
  run: boolean;
  onClose: () => void;
};

export function AppTutorial({ run, onClose }: AppTutorialProps) {
  const steps: Step[] = [
    {
      target: '#nav-dashboard',
      placement: 'right',
      title: 'Dashboard',
      content: 'See KPIs, trends, and quick actions for your clients.',
      disableBeacon: true,
    },
    {
      target: '#nav-calendar',
      placement: 'right',
      title: 'Calendar',
      content: 'Plan workouts, sessions, and reminders with drag-and-drop scheduling.',
    },
    {
      target: '#action-help-tour',
      placement: 'top',
      title: 'Help & Tour',
      content: 'You can replay this tutorial anytime from here.',
    },
  ];

  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === 'finished' || status === 'skipped') {
      onClose();
    }
  };

  return (
    <Joyride
      run={run}
      steps={steps}
      showSkipButton
      showProgress
      continuous
      disableScrolling={false}
      scrollToFirstStep
      styles={{
        options: {
          primaryColor: '#2563eb',
          zIndex: 2000,
        },
      }}
      callback={handleCallback}
    />
  );
}
