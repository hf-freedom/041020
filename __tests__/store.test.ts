import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../src/stores'
import type { RecurrenceRule } from '../src/types'

describe('会议室预订系统 - 基础功能测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('应该正确初始化用户和会议室数据', () => {
    const store = useStore()
    expect(store.users.length).toBe(4)
    expect(store.rooms.length).toBe(5)
    expect(store.currentUser.name).toBe('张三')
  })

  it('应该正确切换当前用户', () => {
    const store = useStore()
    store.setCurrentUser('1')
    expect(store.currentUser.name).toBe('管理员')
    expect(store.isAdmin).toBe(true)
    
    store.setCurrentUser('2')
    expect(store.currentUser.name).toBe('张三')
    expect(store.isAdmin).toBe(false)
  })

  it('应该正确判断用户是否为管理员', () => {
    const store = useStore()
    store.setCurrentUser('1')
    expect(store.isAdmin).toBe(true)
    
    store.setCurrentUser('2')
    expect(store.isAdmin).toBe(false)
  })

  it('应该正确过滤可用的会议室', () => {
    const store = useStore()
    expect(store.availableRooms.length).toBe(5)
    
    store.updateRoom('1', { disabled: true })
    expect(store.availableRooms.length).toBe(4)
  })

  it('应该正确添加新会议室', () => {
    const store = useStore()
    const initialCount = store.rooms.length
    const newRoom = store.addRoom({
      name: '会议室F',
      location: '4楼401',
      disabled: false,
      openTimeStart: '09:00',
      openTimeEnd: '18:00'
    })
    expect(store.rooms.length).toBe(initialCount + 1)
    expect(newRoom.name).toBe('会议室F')
  })

  it('应该正确更新会议室信息', () => {
    const store = useStore()
    store.updateRoom('1', { name: '更新的会议室A' })
    expect(store.rooms.find(r => r.id === '1')?.name).toBe('更新的会议室A')
  })

  it('应该正确删除会议室', () => {
    const store = useStore()
    const initialCount = store.rooms.length
    store.deleteRoom('1')
    expect(store.rooms.length).toBe(initialCount - 1)
    expect(store.rooms.find(r => r.id === '1')).toBeUndefined()
  })

  it('应该正确检测时间冲突', () => {
    const store = useStore()
    store.setCurrentUser('1')
    
    store.addReservation({
      roomId: '1',
      userId: '1',
      date: '2026-04-20',
      startTime: '09:00',
      endTime: '10:00',
      title: '测试会议'
    })

    expect(store.checkTimeConflict('1', '2026-04-20', '08:30', '09:30')).toBe(true)
    expect(store.checkTimeConflict('1', '2026-04-20', '09:30', '10:30')).toBe(true)
    expect(store.checkTimeConflict('1', '2026-04-20', '08:00', '11:00')).toBe(true)
    expect(store.checkTimeConflict('1', '2026-04-20', '10:00', '11:00')).toBe(false)
    expect(store.checkTimeConflict('1', '2026-04-21', '09:00', '10:00')).toBe(false)
  })
})

describe('会议室预订系统 - 预订和审批流程测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('普通用户预订应该处于pending状态', () => {
    const store = useStore()
    store.setCurrentUser('2')
    
    const reservation = store.addReservation({
      roomId: '1',
      userId: '2',
      date: '2026-04-20',
      startTime: '09:00',
      endTime: '10:00',
      title: '普通用户会议'
    })

    expect(reservation.status).toBe('pending')
    expect(reservation.approvedAt).toBeUndefined()
    expect(store.pendingReservations.length).toBe(1)
  })

  it('管理员预订应该直接approved', () => {
    const store = useStore()
    store.setCurrentUser('1')
    
    const reservation = store.addReservation({
      roomId: '1',
      userId: '1',
      date: '2026-04-20',
      startTime: '09:00',
      endTime: '10:00',
      title: '管理员会议'
    })

    expect(reservation.status).toBe('approved')
    expect(reservation.approvedAt).toBeDefined()
    expect(reservation.approvedBy).toBe('1')
  })

  it('管理员应该能够批准预订', () => {
    const store = useStore()
    store.setCurrentUser('2')
    
    const reservation = store.addReservation({
      roomId: '1',
      userId: '2',
      date: '2026-04-20',
      startTime: '09:00',
      endTime: '10:00',
      title: '待审批会议'
    })

    store.setCurrentUser('1')
    store.approveReservation(reservation.id)

    const updated = store.reservations.find(r => r.id === reservation.id)
    expect(updated?.status).toBe('approved')
    expect(updated?.approvedAt).toBeDefined()
    expect(updated?.approvedBy).toBe('1')
  })

  it('管理员应该能够拒绝预订', () => {
    const store = useStore()
    store.setCurrentUser('2')
    
    const reservation = store.addReservation({
      roomId: '1',
      userId: '2',
      date: '2026-04-20',
      startTime: '09:00',
      endTime: '10:00',
      title: '待审批会议'
    })

    store.setCurrentUser('1')
    store.rejectReservation(reservation.id, '时间冲突')

    const updated = store.reservations.find(r => r.id === reservation.id)
    expect(updated?.status).toBe('rejected')
    expect(updated?.rejectReason).toBe('时间冲突')
  })

  it('应该能够取消预订', () => {
    const store = useStore()
    store.setCurrentUser('1')
    
    const reservation = store.addReservation({
      roomId: '1',
      userId: '1',
      date: '2026-04-20',
      startTime: '09:00',
      endTime: '10:00',
      title: '可取消会议'
    })

    store.cancelReservation(reservation.id)

    const updated = store.reservations.find(r => r.id === reservation.id)
    expect(updated?.status).toBe('cancelled')
  })

  it('应该正确获取用户的预订列表', () => {
    const store = useStore()
    store.setCurrentUser('1')
    
    store.addReservation({
      roomId: '1',
      userId: '2',
      date: '2026-04-20',
      startTime: '09:00',
      endTime: '10:00',
      title: '张三的会议'
    })

    const userReservations = store.getReservationsByUser('2')
    expect(userReservations.length).toBe(1)
    expect(userReservations[0].title).toBe('张三的会议')
  })

  it('应该正确按房间和日期获取已批准预订', () => {
    const store = useStore()
    store.setCurrentUser('1')
    
    store.addReservation({
      roomId: '1',
      userId: '1',
      date: '2026-04-20',
      startTime: '09:00',
      endTime: '10:00',
      title: '测试会议'
    })

    const approved = store.getApprovedReservationsByRoomAndDate('1', '2026-04-20')
    expect(approved.length).toBe(1)
    expect(approved[0].status).toBe('approved')
  })
})

describe('会议室预订系统 - 周期预订流程测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('应该能够创建每日周期预订', () => {
    const store = useStore()
    store.setCurrentUser('1')
    
    const rule: RecurrenceRule = {
      type: 'daily',
      interval: 1,
      maxOccurrences: 5
    }

    const result = store.addRecurringReservation(
      {
        roomId: '1',
        userId: '1',
        startTime: '09:00',
        endTime: '10:00',
        title: '每日例会'
      },
      '2026-04-20',
      rule
    )

    expect(result).not.toBeNull()
    expect(result?.occurrences).toBe(5)
    expect(store.recurrenceSeries.length).toBe(1)
    expect(store.reservations.filter(r => r.recurrenceId === result?.series.id).length).toBe(5)
  })

  it('应该能够创建每周周期预订', () => {
    const store = useStore()
    store.setCurrentUser('1')
    
    const rule: RecurrenceRule = {
      type: 'weekly',
      interval: 1,
      daysOfWeek: [1, 3, 5],
      maxOccurrences: 6
    }

    const result = store.addRecurringReservation(
      {
        roomId: '1',
        userId: '1',
        startTime: '09:00',
        endTime: '10:00',
        title: '每周例会'
      },
      '2026-04-20',
      rule
    )

    expect(result).not.toBeNull()
    expect(result?.occurrences).toBe(6)
  })

  it('应该能够创建每月周期预订', () => {
    const store = useStore()
    store.setCurrentUser('1')
    
    const rule: RecurrenceRule = {
      type: 'monthly',
      interval: 1,
      maxOccurrences: 3
    }

    const result = store.addRecurringReservation(
      {
        roomId: '1',
        userId: '1',
        startTime: '09:00',
        endTime: '10:00',
        title: '每月例会'
      },
      '2026-04-20',
      rule
    )

    expect(result).not.toBeNull()
    expect(result?.occurrences).toBe(3)
  })

  it('普通用户的周期预订应该都处于pending状态', () => {
    const store = useStore()
    store.setCurrentUser('2')
    
    const rule: RecurrenceRule = {
      type: 'daily',
      interval: 1,
      maxOccurrences: 3
    }

    const result = store.addRecurringReservation(
      {
        roomId: '1',
        userId: '2',
        startTime: '09:00',
        endTime: '10:00',
        title: '普通用户周期会议'
      },
      '2026-04-20',
      rule
    )

    const recurringReservations = store.reservations.filter(r => r.recurrenceId === result?.series.id)
    recurringReservations.forEach(r => {
      expect(r.status).toBe('pending')
    })
  })

  it('批准周期预订应该批准整个系列', () => {
    const store = useStore()
    store.setCurrentUser('2')
    
    const rule: RecurrenceRule = {
      type: 'daily',
      interval: 1,
      maxOccurrences: 3
    }

    const result = store.addRecurringReservation(
      {
        roomId: '1',
        userId: '2',
        startTime: '09:00',
        endTime: '10:00',
        title: '周期会议'
      },
      '2026-04-20',
      rule
    )

    store.setCurrentUser('1')
    store.approveReservation(result!.masterReservation.id)

    const recurringReservations = store.reservations.filter(r => r.recurrenceId === result?.series.id)
    recurringReservations.forEach(r => {
      expect(r.status).toBe('approved')
    })
  })

  it('拒绝周期预订应该拒绝整个系列', () => {
    const store = useStore()
    store.setCurrentUser('2')
    
    const rule: RecurrenceRule = {
      type: 'daily',
      interval: 1,
      maxOccurrences: 3
    }

    const result = store.addRecurringReservation(
      {
        roomId: '1',
        userId: '2',
        startTime: '09:00',
        endTime: '10:00',
        title: '周期会议'
      },
      '2026-04-20',
      rule
    )

    store.setCurrentUser('1')
    store.rejectReservation(result!.masterReservation.id, '时间不合适')

    const recurringReservations = store.reservations.filter(r => r.recurrenceId === result?.series.id)
    recurringReservations.forEach(r => {
      expect(r.status).toBe('rejected')
    })
  })

  it('应该能够取消周期系列中的单个预订', () => {
    const store = useStore()
    store.setCurrentUser('1')
    
    const rule: RecurrenceRule = {
      type: 'daily',
      interval: 1,
      maxOccurrences: 5
    }

    const result = store.addRecurringReservation(
      {
        roomId: '1',
        userId: '1',
        startTime: '09:00',
        endTime: '10:00',
        title: '每日例会'
      },
      '2026-04-20',
      rule
    )

    const seriesReservations = store.getReservationsBySeries(result!.series.id)
    const toCancel = seriesReservations[1]
    
    store.cancelSingleRecurrence(toCancel.id)

    expect(store.reservations.find(r => r.id === toCancel.id)?.status).toBe('cancelled')
    expect(store.reservations.find(r => r.id === seriesReservations[0].id)?.status).toBe('approved')
  })

  it('应该能够取消整个周期系列', () => {
    const store = useStore()
    store.setCurrentUser('1')
    
    const rule: RecurrenceRule = {
      type: 'daily',
      interval: 1,
      maxOccurrences: 5
    }

    const result = store.addRecurringReservation(
      {
        roomId: '1',
        userId: '1',
        startTime: '09:00',
        endTime: '10:00',
        title: '每日例会'
      },
      '2026-04-20',
      rule
    )

    store.cancelAllRecurrences(result!.series.id)

    const series = store.getRecurrenceSeries(result!.series.id)
    expect(series?.status).toBe('cancelled')
    
    const seriesReservations = store.getReservationsBySeries(result!.series.id)
    seriesReservations.forEach(r => {
      expect(r.status).toBe('cancelled')
    })
  })

  it('应该正确获取周期系列信息', () => {
    const store = useStore()
    store.setCurrentUser('1')
    
    const rule: RecurrenceRule = {
      type: 'daily',
      interval: 1,
      maxOccurrences: 5
    }

    const result = store.addRecurringReservation(
      {
        roomId: '1',
        userId: '1',
        startTime: '09:00',
        endTime: '10:00',
        title: '每日例会'
      },
      '2026-04-20',
      rule
    )

    const series = store.getRecurrenceSeries(result!.series.id)
    expect(series).toBeDefined()
    expect(series?.occurrences.length).toBe(5)
  })
})

describe('会议室预订系统 - 排队与候补流程测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('应该能够添加到候补列表', () => {
    const store = useStore()
    store.setCurrentUser('1')
    
    store.addReservation({
      roomId: '1',
      userId: '1',
      date: '2026-04-20',
      startTime: '09:00',
      endTime: '10:00',
      title: '已有会议'
    })

    store.setCurrentUser('2')
    const waitlistEntry = store.addToWaitlist('1', '2026-04-20', '09:00', '10:00', '候补会议')

    expect(waitlistEntry.status).toBe('waiting')
    expect(waitlistEntry.position).toBe(1)
    expect(store.waitingListEntries.length).toBe(1)
  })

  it('候补列表应该按位置排序', () => {
    const store = useStore()
    store.setCurrentUser('1')
    
    store.addReservation({
      roomId: '1',
      userId: '1',
      date: '2026-04-20',
      startTime: '09:00',
      endTime: '10:00',
      title: '已有会议'
    })

    store.setCurrentUser('2')
    store.addToWaitlist('1', '2026-04-20', '09:00', '10:00', '候补会议1')
    
    store.setCurrentUser('3')
    store.addToWaitlist('1', '2026-04-20', '09:00', '10:00', '候补会议2')

    expect(store.waitingListEntries[0].position).toBe(1)
    expect(store.waitingListEntries[1].position).toBe(2)
    expect(store.waitingListEntries[0].userId).toBe('2')
  })

  it('取消预订应该自动处理候补列表', () => {
    const store = useStore()
    store.setCurrentUser('1')
    
    const reservation = store.addReservation({
      roomId: '1',
      userId: '1',
      date: '2026-04-20',
      startTime: '09:00',
      endTime: '10:00',
      title: '可取消会议'
    })

    store.setCurrentUser('2')
    store.addToWaitlist('1', '2026-04-20', '09:00', '10:00', '候补会议')

    store.setCurrentUser('1')
    store.cancelReservation(reservation.id)

    const assignedWaitlist = store.waitlist.filter(w => w.status === 'assigned')
    expect(assignedWaitlist.length).toBe(1)
    expect(assignedWaitlist[0].userId).toBe('2')

    const newReservation = store.reservations.find(r => r.id === assignedWaitlist[0].assignedReservationId)
    expect(newReservation).toBeDefined()
    expect(newReservation?.status).toBe('approved')
    expect(newReservation?.userId).toBe('2')
  })

  it('取消候补应该重新排序位置', () => {
    const store = useStore()
    store.setCurrentUser('1')
    
    store.addReservation({
      roomId: '1',
      userId: '1',
      date: '2026-04-20',
      startTime: '09:00',
      endTime: '10:00',
      title: '已有会议'
    })

    store.setCurrentUser('2')
    const entry1 = store.addToWaitlist('1', '2026-04-20', '09:00', '10:00', '候补会议1')
    
    store.setCurrentUser('3')
    const entry2 = store.addToWaitlist('1', '2026-04-20', '09:00', '10:00', '候补会议2')

    store.cancelWaitlistEntry(entry1.id)

    const remainingEntry = store.waitlist.find(w => w.id === entry2.id)
    expect(remainingEntry?.position).toBe(1)
  })

  it('应该能够按用户获取候补列表', () => {
    const store = useStore()
    store.setCurrentUser('1')
    
    store.addReservation({
      roomId: '1',
      userId: '1',
      date: '2026-04-20',
      startTime: '09:00',
      endTime: '10:00',
      title: '已有会议'
    })

    store.setCurrentUser('2')
    store.addToWaitlist('1', '2026-04-20', '09:00', '10:00', '候补会议')

    const userWaitlist = store.getWaitlistByUser('2')
    expect(userWaitlist.length).toBe(1)
    expect(userWaitlist[0].userId).toBe('2')
  })

  it('应该正确获取特定时段的候补列表', () => {
    const store = useStore()
    store.setCurrentUser('1')
    
    store.addReservation({
      roomId: '1',
      userId: '1',
      date: '2026-04-20',
      startTime: '09:00',
      endTime: '10:00',
      title: '已有会议'
    })

    store.setCurrentUser('2')
    store.addToWaitlist('1', '2026-04-20', '09:00', '10:00', '候补会议1')
    
    store.setCurrentUser('3')
    store.addToWaitlist('1', '2026-04-20', '09:00', '10:00', '候补会议2')

    const slotWaitlist = store.getWaitlistForSlot('1', '2026-04-20', '09:00', '10:00')
    expect(slotWaitlist.length).toBe(2)
    expect(slotWaitlist[0].position).toBe(1)
    expect(slotWaitlist[1].position).toBe(2)
  })

  it('处理候补时应该按位置顺序分配', () => {
    const store = useStore()
    store.setCurrentUser('1')
    
    const reservation = store.addReservation({
      roomId: '1',
      userId: '1',
      date: '2026-04-20',
      startTime: '09:00',
      endTime: '10:00',
      title: '可取消会议'
    })

    store.setCurrentUser('2')
    store.addToWaitlist('1', '2026-04-20', '09:00', '10:00', '用户2候补')
    
    store.setCurrentUser('3')
    store.addToWaitlist('1', '2026-04-20', '09:00', '10:00', '用户3候补')

    store.setCurrentUser('1')
    store.cancelReservation(reservation.id)

    const assignedEntry = store.waitlist.find(w => w.status === 'assigned')
    expect(assignedEntry?.userId).toBe('2')
    
    const stillWaiting = store.waitlist.find(w => w.userId === '3')
    expect(stillWaiting?.status).toBe('waiting')
    expect(stillWaiting?.position).toBe(1)
  })
})

describe('会议室预订系统 - 用户侧状态验证集成测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('管理员审批后，用户侧应该能看到预订状态变为已批准', () => {
    const store = useStore()
    
    store.setCurrentUser('2')
    const reservation = store.addReservation({
      roomId: '1',
      userId: '2',
      date: '2026-04-20',
      startTime: '09:00',
      endTime: '10:00',
      title: '用户申请的会议'
    })

    let userReservations = store.getReservationsByUser('2')
    expect(userReservations[0].status).toBe('pending')
    expect(userReservations[0].approvedAt).toBeUndefined()

    store.setCurrentUser('1')
    store.approveReservation(reservation.id)

    store.setCurrentUser('2')
    userReservations = store.getReservationsByUser('2')
    expect(userReservations[0].status).toBe('approved')
    expect(userReservations[0].approvedAt).toBeDefined()
    expect(userReservations[0].approvedBy).toBe('1')
  })

  it('管理员驳回后，用户侧应该能看到预订状态变为已拒绝并显示驳回原因', () => {
    const store = useStore()
    
    store.setCurrentUser('2')
    const reservation = store.addReservation({
      roomId: '1',
      userId: '2',
      date: '2026-04-20',
      startTime: '09:00',
      endTime: '10:00',
      title: '用户申请的会议'
    })

    let userReservations = store.getReservationsByUser('2')
    expect(userReservations[0].status).toBe('pending')
    expect(userReservations[0].rejectReason).toBeUndefined()

    store.setCurrentUser('1')
    store.rejectReservation(reservation.id, '该时段已有更重要的会议安排')

    store.setCurrentUser('2')
    userReservations = store.getReservationsByUser('2')
    expect(userReservations[0].status).toBe('rejected')
    expect(userReservations[0].rejectReason).toBe('该时段已有更重要的会议安排')
  })

  it('用户A取消候补后，用户B应该自动晋升到第一位并获得预订机会', () => {
    const store = useStore()
    store.setCurrentUser('1')
    
    const existingReservation = store.addReservation({
      roomId: '1',
      userId: '1',
      date: '2026-04-20',
      startTime: '09:00',
      endTime: '10:00',
      title: '已有占用会议'
    })

    store.setCurrentUser('2')
    const userAEntry = store.addToWaitlist('1', '2026-04-20', '09:00', '10:00', '用户A的候补')
    
    store.setCurrentUser('3')
    store.addToWaitlist('1', '2026-04-20', '09:00', '10:00', '用户B的候补')

    store.setCurrentUser('3')
    let userBWaitlist = store.getWaitlistByUser('3')
    expect(userBWaitlist[0].position).toBe(2)
    expect(userBWaitlist[0].status).toBe('waiting')

    store.setCurrentUser('2')
    store.cancelWaitlistEntry(userAEntry.id)

    store.setCurrentUser('3')
    userBWaitlist = store.getWaitlistByUser('3')
    expect(userBWaitlist[0].position).toBe(1)
    expect(userBWaitlist[0].status).toBe('waiting')

    store.setCurrentUser('1')
    store.cancelReservation(existingReservation.id)

    store.setCurrentUser('3')
    const userBReservations = store.getReservationsByUser('3')
    const userBWaitlistFinal = store.getWaitlistByUser('3')
    
    expect(userBReservations.length).toBe(1)
    expect(userBReservations[0].status).toBe('approved')
    expect(userBReservations[0].title).toBe('用户B的候补')
    expect(userBWaitlistFinal[0].status).toBe('assigned')
    expect(userBWaitlistFinal[0].assignedReservationId).toBe(userBReservations[0].id)
  })

  it('原始预订人取消后，第一位候补用户应该直接自动预订成功，无需再次申请', () => {
    const store = useStore()
    store.setCurrentUser('1')
    
    const originalReservation = store.addReservation({
      roomId: '1',
      userId: '1',
      date: '2026-04-20',
      startTime: '09:00',
      endTime: '10:00',
      title: '原始预订会议'
    })

    store.setCurrentUser('2')
    store.addToWaitlist('1', '2026-04-20', '09:00', '10:00', '候补用户的会议')

    store.setCurrentUser('1')
    store.cancelReservation(originalReservation.id)

    store.setCurrentUser('2')
    const userReservations = store.getReservationsByUser('2')
    
    expect(userReservations.length).toBe(1)
    expect(userReservations[0].status).toBe('approved')
    expect(userReservations[0].title).toBe('候补用户的会议')
    expect(userReservations[0].approvedBy).toBe('system')
    expect(userReservations[0].roomId).toBe('1')
    expect(userReservations[0].date).toBe('2026-04-20')
    expect(userReservations[0].startTime).toBe('09:00')
    expect(userReservations[0].endTime).toBe('10:00')

    const userWaitlist = store.getWaitlistByUser('2')
    expect(userWaitlist[0].status).toBe('assigned')
    expect(userWaitlist[0].assignedReservationId).toBe(userReservations[0].id)
  })

  it('用户侧应该能同时看到自己的预订状态和候补状态', () => {
    const store = useStore()
    store.setCurrentUser('1')
    
    store.addReservation({
      roomId: '1',
      userId: '1',
      date: '2026-04-20',
      startTime: '09:00',
      endTime: '10:00',
      title: '已有会议'
    })

    store.setCurrentUser('2')
    store.addReservation({
      roomId: '1',
      userId: '2',
      date: '2026-04-21',
      startTime: '10:00',
      endTime: '11:00',
      title: '已申请的预订'
    })
    store.addToWaitlist('1', '2026-04-20', '09:00', '10:00', '候补中的会议')

    const userReservations = store.getReservationsByUser('2')
    const userWaitlist = store.getWaitlistByUser('2')
    
    expect(userReservations.length).toBe(1)
    expect(userReservations[0].status).toBe('pending')
    expect(userReservations[0].title).toBe('已申请的预订')
    
    expect(userWaitlist.length).toBe(1)
    expect(userWaitlist[0].status).toBe('waiting')
    expect(userWaitlist[0].position).toBe(1)
    expect(userWaitlist[0].title).toBe('候补中的会议')
  })
})
