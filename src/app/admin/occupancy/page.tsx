import React from 'react';
import { Metadata } from 'next';
import { OccupancyClient } from './occupancy-client';

export const metadata: Metadata = {
  title: 'Occupancy Intelligence & 2D/3D CAD Telemetry | SSPACIA Super Admin',
  description: 'Live centre-by-centre occupancy telemetry, CAD visual blueprint floor plans, cabin and desk allocation tracking for SSPACIA.',
};

export default function OccupancyPage() {
  return <OccupancyClient />;
}
