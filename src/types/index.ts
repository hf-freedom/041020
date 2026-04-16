export interface User {
  id: string
  name: string
  role: 'admin' | 'user'
}

export interface MeetingRoom {
  id: string
  name: string
  location: string
  disabled: boolean
  openTimeStart: string
  openTimeEnd: string
}

export type ReservationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'waitlist'

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom'

export interface RecurrenceRule {
  type: RecurrenceType
  interval: number
  daysOfWeek?: number[]
  dayOfMonth?: number
  endDate?: string
  maxOccurrences?: number
}

export interface Reservation {
  id: string
  roomId: string
  userId: string
  date: string
  startTime: string
  endTime: string
  title: string
  status: ReservationStatus
  createdAt: string
  approvedAt?: string
  approvedBy?: string
  rejectReason?: string
  recurrenceId?: string
  recurrenceRule?: RecurrenceRule
  isRecurrenceMaster?: boolean
  originalOccurrenceDate?: string
}

export interface WaitlistEntry {
  id: string
  roomId: string
  userId: string
  date: string
  startTime: string
  endTime: string
  title: string
  createdAt: string
  position: number
  status: 'waiting' | 'assigned' | 'cancelled'
  assignedReservationId?: string
}

export interface RecurrenceSeries {
  id: string
  masterReservationId: string
  rule: RecurrenceRule
  roomId: string
  userId: string
  startTime: string
  endTime: string
  title: string
  status: 'active' | 'cancelled'
  createdAt: string
  occurrences: string[]
  cancelledOccurrences: string[]
}
