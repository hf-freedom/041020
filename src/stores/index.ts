import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, MeetingRoom, Reservation, ReservationStatus, RecurrenceRule, WaitlistEntry, RecurrenceSeries } from '../types'

const generateId = () => Math.random().toString(36).substr(2, 9)

const initialUsers: User[] = [
  { id: '1', name: '管理员', role: 'admin' },
  { id: '2', name: '张三', role: 'user' },
  { id: '3', name: '李四', role: 'user' },
  { id: '4', name: '王五', role: 'user' },
]

const initialRooms: MeetingRoom[] = [
  { id: '1', name: '会议室A', location: '1楼101', disabled: false, openTimeStart: '08:00', openTimeEnd: '18:00' },
  { id: '2', name: '会议室B', location: '1楼102', disabled: false, openTimeStart: '08:00', openTimeEnd: '18:00' },
  { id: '3', name: '会议室C', location: '2楼201', disabled: false, openTimeStart: '09:00', openTimeEnd: '17:00' },
  { id: '4', name: '会议室D', location: '2楼202', disabled: false, openTimeStart: '08:30', openTimeEnd: '18:30' },
  { id: '5', name: '会议室E', location: '3楼301', disabled: false, openTimeStart: '08:00', openTimeEnd: '20:00' },
]

function generateRecurrenceDates(startDate: string, rule: RecurrenceRule): string[] {
  const dates: string[] = []
  const start = new Date(startDate)
  const end = rule.endDate ? new Date(rule.endDate) : null
  const maxOccurrences = rule.maxOccurrences || 50
  
  let current = new Date(start)
  let occurrences = 0
  
  while (occurrences < maxOccurrences) {
    if (end && current > end) break
    
    const dateStr = current.toISOString().split('T')[0]
    
    if (rule.type === 'daily') {
      dates.push(dateStr)
      occurrences++
      current.setDate(current.getDate() + rule.interval)
    } else if (rule.type === 'weekly') {
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        if (rule.daysOfWeek.includes(current.getDay())) {
          dates.push(dateStr)
          occurrences++
        }
        current.setDate(current.getDate() + 1)
      } else {
        dates.push(dateStr)
        occurrences++
        current.setDate(current.getDate() + 7 * rule.interval)
      }
    } else if (rule.type === 'monthly') {
      dates.push(dateStr)
      occurrences++
      current.setMonth(current.getMonth() + rule.interval)
    } else if (rule.type === 'custom') {
      dates.push(dateStr)
      occurrences++
      current.setDate(current.getDate() + rule.interval)
    } else {
      break
    }
  }
  
  return dates
}

export const useStore = defineStore('app', () => {
  const currentUser = ref<User>(initialUsers[1])
  const users = ref<User[]>(initialUsers)
  const rooms = ref<MeetingRoom[]>(initialRooms)
  const reservations = ref<Reservation[]>([])
  const waitlist = ref<WaitlistEntry[]>([])
  const recurrenceSeries = ref<RecurrenceSeries[]>([])

  const isAdmin = computed(() => currentUser.value.role === 'admin')
  const availableRooms = computed(() => rooms.value.filter(r => !r.disabled))

  const pendingReservations = computed(() => {
    return reservations.value
      .filter(r => r.status === 'pending')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  })

  const waitingListEntries = computed(() => {
    return waitlist.value
      .filter(w => w.status === 'waiting')
      .sort((a, b) => a.position - b.position)
  })

  function setCurrentUser(userId: string) {
    const user = users.value.find(u => u.id === userId)
    if (user) {
      currentUser.value = user
    }
  }

  function addRoom(room: Omit<MeetingRoom, 'id'>) {
    const newRoom: MeetingRoom = {
      ...room,
      id: generateId(),
    }
    rooms.value.push(newRoom)
    return newRoom
  }

  function updateRoom(id: string, updates: Partial<MeetingRoom>) {
    const index = rooms.value.findIndex(r => r.id === id)
    if (index !== -1) {
      rooms.value[index] = { ...rooms.value[index], ...updates }
    }
  }

  function deleteRoom(id: string) {
    const index = rooms.value.findIndex(r => r.id === id)
    if (index !== -1) {
      rooms.value.splice(index, 1)
    }
  }

  function addReservation(reservation: Omit<Reservation, 'id' | 'createdAt' | 'status' | 'approvedAt' | 'approvedBy'>) {
    const isUserAdmin = currentUser.value.role === 'admin'
    const newReservation: Reservation = {
      ...reservation,
      id: generateId(),
      createdAt: new Date().toISOString(),
      status: isUserAdmin ? 'approved' : 'pending',
      ...(isUserAdmin ? {
        approvedAt: new Date().toISOString(),
        approvedBy: currentUser.value.id
      } : {})
    }
    reservations.value.push(newReservation)
    return newReservation
  }

  function addRecurringReservation(
    baseReservation: Omit<Reservation, 'id' | 'createdAt' | 'status' | 'approvedAt' | 'approvedBy' | 'date'>,
    startDate: string,
    rule: RecurrenceRule
  ) {
    const isUserAdmin = currentUser.value.role === 'admin'
    const dates = generateRecurrenceDates(startDate, rule)
    
    if (dates.length === 0) return null
    
    const seriesId = generateId()
    const masterId = generateId()
    
    const masterReservation: Reservation = {
      ...baseReservation,
      id: masterId,
      date: dates[0],
      createdAt: new Date().toISOString(),
      status: isUserAdmin ? 'approved' : 'pending',
      recurrenceId: seriesId,
      isRecurrenceMaster: true,
      recurrenceRule: rule,
      ...(isUserAdmin ? {
        approvedAt: new Date().toISOString(),
        approvedBy: currentUser.value.id
      } : {})
    }
    reservations.value.push(masterReservation)
    
    const series: RecurrenceSeries = {
      id: seriesId,
      masterReservationId: masterId,
      rule,
      roomId: baseReservation.roomId,
      userId: baseReservation.userId,
      startTime: baseReservation.startTime,
      endTime: baseReservation.endTime,
      title: baseReservation.title,
      status: 'active',
      createdAt: new Date().toISOString(),
      occurrences: dates,
      cancelledOccurrences: []
    }
    recurrenceSeries.value.push(series)
    
    for (let i = 1; i < dates.length; i++) {
      const occurrence: Reservation = {
        ...baseReservation,
        id: generateId(),
        date: dates[i],
        createdAt: new Date().toISOString(),
        status: isUserAdmin ? 'approved' : 'pending',
        recurrenceId: seriesId,
        originalOccurrenceDate: dates[i],
        ...(isUserAdmin ? {
          approvedAt: new Date().toISOString(),
          approvedBy: currentUser.value.id
        } : {})
      }
      reservations.value.push(occurrence)
    }
    
    return { masterReservation, series, occurrences: dates.length }
  }

  function cancelSingleRecurrence(reservationId: string) {
    const reservation = reservations.value.find(r => r.id === reservationId)
    if (!reservation || !reservation.recurrenceId) return
    
    reservation.status = 'cancelled'
    
    const series = recurrenceSeries.value.find(s => s.id === reservation.recurrenceId)
    if (series && reservation.originalOccurrenceDate) {
      if (!series.cancelledOccurrences.includes(reservation.originalOccurrenceDate)) {
        series.cancelledOccurrences.push(reservation.originalOccurrenceDate)
      }
    } else if (series && reservation.isRecurrenceMaster) {
      if (!series.cancelledOccurrences.includes(reservation.date)) {
        series.cancelledOccurrences.push(reservation.date)
      }
    }
    
    processWaitlistForSlot(reservation.roomId, reservation.date, reservation.startTime, reservation.endTime)
  }

  function cancelAllRecurrences(seriesId: string) {
    const series = recurrenceSeries.value.find(s => s.id === seriesId)
    if (!series) return
    
    series.status = 'cancelled'
    
    const relatedReservations = reservations.value.filter(r => r.recurrenceId === seriesId)
    for (const reservation of relatedReservations) {
      if (reservation.status === 'pending' || reservation.status === 'approved') {
        reservation.status = 'cancelled'
        processWaitlistForSlot(reservation.roomId, reservation.date, reservation.startTime, reservation.endTime)
      }
    }
  }

  function approveReservation(reservationId: string) {
    const index = reservations.value.findIndex(r => r.id === reservationId)
    if (index !== -1) {
      reservations.value[index] = {
        ...reservations.value[index],
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: currentUser.value.id
      }
      
      if (reservations.value[index].recurrenceId) {
        const series = recurrenceSeries.value.find(s => s.id === reservations.value[index].recurrenceId)
        if (series) {
          const relatedReservations = reservations.value.filter(
            r => r.recurrenceId === reservations.value[index].recurrenceId && r.id !== reservationId && r.status === 'pending'
          )
          for (const related of relatedReservations) {
            related.status = 'approved'
            related.approvedAt = new Date().toISOString()
            related.approvedBy = currentUser.value.id
          }
        }
      }
    }
  }

  function rejectReservation(reservationId: string, reason: string) {
    const index = reservations.value.findIndex(r => r.id === reservationId)
    if (index !== -1) {
      reservations.value[index] = {
        ...reservations.value[index],
        status: 'rejected',
        rejectReason: reason
      }
      
      if (reservations.value[index].recurrenceId) {
        const relatedReservations = reservations.value.filter(
          r => r.recurrenceId === reservations.value[index].recurrenceId && r.id !== reservationId && r.status === 'pending'
        )
        for (const related of relatedReservations) {
          related.status = 'rejected'
          related.rejectReason = reason
        }
        
        const series = recurrenceSeries.value.find(s => s.id === reservations.value[index].recurrenceId)
        if (series) {
          series.status = 'cancelled'
        }
      }
    }
  }

  function cancelReservation(id: string) {
    const reservation = reservations.value.find(r => r.id === id)
    if (!reservation) return
    
    if (reservation.recurrenceId && !reservation.isRecurrenceMaster) {
      cancelSingleRecurrence(id)
      return
    }
    
    if (reservation.recurrenceId && reservation.isRecurrenceMaster) {
      cancelAllRecurrences(reservation.recurrenceId)
      return
    }
    
    const index = reservations.value.findIndex(r => r.id === id)
    if (index !== -1) {
      reservations.value[index] = {
        ...reservations.value[index],
        status: 'cancelled'
      }
      processWaitlistForSlot(reservation.roomId, reservation.date, reservation.startTime, reservation.endTime)
    }
  }

  function deleteReservation(id: string) {
    const index = reservations.value.findIndex(r => r.id === id)
    if (index !== -1) {
      reservations.value.splice(index, 1)
    }
  }

  function addToWaitlist(
    roomId: string,
    date: string,
    startTime: string,
    endTime: string,
    title: string
  ) {
    const existingEntries = waitlist.value.filter(
      w => w.roomId === roomId && w.date === date && w.status === 'waiting'
    )
    
    const entry: WaitlistEntry = {
      id: generateId(),
      roomId,
      userId: currentUser.value.id,
      date,
      startTime,
      endTime,
      title,
      createdAt: new Date().toISOString(),
      position: existingEntries.length + 1,
      status: 'waiting'
    }
    
    waitlist.value.push(entry)
    return entry
  }

  function cancelWaitlistEntry(entryId: string) {
    const entry = waitlist.value.find(w => w.id === entryId)
    if (entry) {
      entry.status = 'cancelled'
      reorderWaitlist(entry.roomId, entry.date)
    }
  }

  function reorderWaitlist(roomId: string, date: string) {
    const entries = waitlist.value
      .filter(w => w.roomId === roomId && w.date === date && w.status === 'waiting')
      .sort((a, b) => a.position - b.position)
    
    entries.forEach((entry, index) => {
      entry.position = index + 1
    })
  }

  function processWaitlistForSlot(roomId: string, date: string, startTime: string, endTime: string) {
    const allWaitingEntries = waitlist.value.filter(
      w => w.roomId === roomId 
        && w.date === date 
        && w.status === 'waiting'
    ).sort((a, b) => a.position - b.position)
    
    for (const entry of allWaitingEntries) {
      if (!checkTimeConflict(roomId, date, entry.startTime, entry.endTime)) {
        const newReservation: Reservation = {
          id: generateId(),
          roomId,
          userId: entry.userId,
          date,
          startTime: entry.startTime,
          endTime: entry.endTime,
          title: entry.title,
          status: 'approved',
          createdAt: new Date().toISOString(),
          approvedAt: new Date().toISOString(),
          approvedBy: 'system'
        }
        
        reservations.value.push(newReservation)
        
        entry.status = 'assigned'
        entry.assignedReservationId = newReservation.id
      }
    }
    
    reorderWaitlist(roomId, date)
  }

  function getApprovedReservationsByRoomAndDate(roomId: string, date: string) {
    return reservations.value.filter(
      r => r.roomId === roomId && r.date === date && r.status === 'approved'
    )
  }

  function getActiveReservationsByRoomAndDate(roomId: string, date: string) {
    return reservations.value.filter(
      r => r.roomId === roomId && r.date === date && (r.status === 'approved' || r.status === 'pending')
    )
  }

  function getReservationsByUser(userId: string) {
    return reservations.value
      .filter(r => r.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  function getWaitlistByUser(userId: string) {
    return waitlist.value
      .filter(w => w.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  function getWaitlistForSlot(roomId: string, date: string, startTime: string, endTime: string) {
    return waitlist.value.filter(
      w => w.roomId === roomId 
        && w.date === date 
        && w.startTime === startTime 
        && w.endTime === endTime 
        && w.status === 'waiting'
    ).sort((a, b) => a.position - b.position)
  }

  function getRecurrenceSeries(seriesId: string) {
    return recurrenceSeries.value.find(s => s.id === seriesId)
  }

  function getReservationsBySeries(seriesId: string) {
    return reservations.value
      .filter(r => r.recurrenceId === seriesId)
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  function checkTimeConflict(roomId: string, date: string, startTime: string, endTime: string, excludeId?: string) {
    const roomReservations = reservations.value.filter(
      r => r.roomId === roomId 
        && r.date === date 
        && r.id !== excludeId
        && (r.status === 'approved' || r.status === 'pending')
    )
    
    for (const reservation of roomReservations) {
      const existingStart = reservation.startTime
      const existingEnd = reservation.endTime
      
      if (
        (startTime >= existingStart && startTime < existingEnd) ||
        (endTime > existingStart && endTime <= existingEnd) ||
        (startTime <= existingStart && endTime >= existingEnd)
      ) {
        return true
      }
    }
    return false
  }

  return {
    currentUser,
    users,
    rooms,
    reservations,
    waitlist,
    recurrenceSeries,
    isAdmin,
    availableRooms,
    pendingReservations,
    waitingListEntries,
    setCurrentUser,
    addRoom,
    updateRoom,
    deleteRoom,
    addReservation,
    addRecurringReservation,
    cancelSingleRecurrence,
    cancelAllRecurrences,
    approveReservation,
    rejectReservation,
    cancelReservation,
    deleteReservation,
    addToWaitlist,
    cancelWaitlistEntry,
    processWaitlistForSlot,
    getApprovedReservationsByRoomAndDate,
    getActiveReservationsByRoomAndDate,
    getReservationsByUser,
    getWaitlistByUser,
    getWaitlistForSlot,
    getRecurrenceSeries,
    getReservationsBySeries,
    checkTimeConflict,
  }
})
