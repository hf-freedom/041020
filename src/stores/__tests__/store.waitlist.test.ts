import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStore } from '../index'

describe('会议室预定系统 - 预定排队与候补流程测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('加入候补队列', () => {
    it('应该能将用户加入候补队列', () => {
      const store = useStore()
      const entry = store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补预定')

      expect(entry).toBeDefined()
      expect(entry.roomId).toBe('1')
      expect(entry.date).toBe('2024-01-01')
      expect(entry.startTime).toBe('09:00')
      expect(entry.endTime).toBe('10:00')
      expect(entry.title).toBe('候补预定')
      expect(entry.status).toBe('waiting')
      expect(entry.position).toBe(1)
    })

    it('多个候补应该按顺序分配位置', () => {
      const store = useStore()

      store.setCurrentUser('2')
      const entry1 = store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补1')

      store.setCurrentUser('3')
      const entry2 = store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补2')

      store.setCurrentUser('4')
      const entry3 = store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补3')

      expect(entry1.position).toBe(1)
      expect(entry2.position).toBe(2)
      expect(entry3.position).toBe(3)
    })

    it('不同日期应该有独立的候补队列', () => {
      const store = useStore()

      const entry1 = store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补1')
      const entry2 = store.addToWaitlist('1', '2024-01-02', '09:00', '10:00', '候补2')

      expect(entry1.position).toBe(1)
      expect(entry2.position).toBe(1)
    })

    it('不同会议室应该有独立的候补队列', () => {
      const store = useStore()

      const entry1 = store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补1')
      const entry2 = store.addToWaitlist('2', '2024-01-01', '09:00', '10:00', '候补2')

      expect(entry1.position).toBe(1)
      expect(entry2.position).toBe(1)
    })

    it('候补条目应该包含正确的用户信息', () => {
      const store = useStore()
      const userId = store.currentUser.id

      const entry = store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补预定')

      expect(entry.userId).toBe(userId)
      expect(entry.createdAt).toBeDefined()
      expect(entry.id).toBeDefined()
    })
  })

  describe('候补队列查询', () => {
    it('应该能获取用户的候补列表', () => {
      const store = useStore()
      const userId = store.currentUser.id

      store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补1')
      store.addToWaitlist('2', '2024-01-02', '10:00', '11:00', '候补2')

      const userWaitlist = store.getWaitlistByUser(userId)
      expect(userWaitlist).toHaveLength(2)
    })

    it('用户候补列表应该按创建时间倒序排列', () => {
      const store = useStore()
      const userId = store.currentUser.id

      const entry1 = store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补1')
      const entry2 = store.addToWaitlist('2', '2024-01-02', '10:00', '11:00', '候补2')

      const userWaitlist = store.getWaitlistByUser(userId)
      const sortedByTime = [...userWaitlist].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      expect(userWaitlist).toEqual(sortedByTime)
    })

    it('应该能获取特定时段的候补列表', () => {
      const store = useStore()

      store.setCurrentUser('2')
      store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补1')

      store.setCurrentUser('3')
      store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补2')

      const slotWaitlist = store.getWaitlistForSlot('1', '2024-01-01', '09:00', '10:00')
      expect(slotWaitlist).toHaveLength(2)
    })

    it('特定时段候补列表应该按位置排序', () => {
      const store = useStore()

      store.setCurrentUser('2')
      store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补1')

      store.setCurrentUser('3')
      store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补2')

      store.setCurrentUser('4')
      store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补3')

      const slotWaitlist = store.getWaitlistForSlot('1', '2024-01-01', '09:00', '10:00')
      expect(slotWaitlist[0].position).toBe(1)
      expect(slotWaitlist[1].position).toBe(2)
      expect(slotWaitlist[2].position).toBe(3)
    })

    it('应该能获取等待中的候补列表', () => {
      const store = useStore()

      store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补1')
      store.addToWaitlist('1', '2024-01-01', '14:00', '15:00', '候补2')

      expect(store.waitingListEntries).toHaveLength(2)
    })
  })

  describe('取消候补', () => {
    it('应该能取消候补条目', () => {
      const store = useStore()
      const entry = store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补预定')

      store.cancelWaitlistEntry(entry.id)

      const cancelledEntry = store.waitlist.find(w => w.id === entry.id)
      expect(cancelledEntry?.status).toBe('cancelled')
    })

    it('取消候补后应该重新排序队列', () => {
      const store = useStore()

      store.setCurrentUser('2')
      const entry1 = store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补1')

      store.setCurrentUser('3')
      const entry2 = store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补2')

      store.setCurrentUser('4')
      const entry3 = store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补3')

      store.cancelWaitlistEntry(entry2.id)

      const updatedEntry3 = store.waitlist.find(w => w.id === entry3.id)
      expect(updatedEntry3?.position).toBe(2)
    })

    it('取消候补后等待列表应该更新', () => {
      const store = useStore()
      const entry = store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补预定')

      expect(store.waitingListEntries).toHaveLength(1)

      store.cancelWaitlistEntry(entry.id)

      expect(store.waitingListEntries).toHaveLength(0)
    })
  })

  describe('候补自动转正流程', () => {
    it('取消预定后候补应该自动转为正式预定', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const reservation = store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '原始预定'
      })

      store.setCurrentUser('2')
      store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补预定')

      store.setCurrentUser('1')
      store.cancelReservation(reservation.id)

      const newReservation = store.reservations.find(r => r.title === '候补预定')
      expect(newReservation).toBeDefined()
      expect(newReservation?.status).toBe('approved')
    })

    it('候补转正后应该更新候补状态', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const reservation = store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '原始预定'
      })

      store.setCurrentUser('2')
      const entry = store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补预定')

      store.setCurrentUser('1')
      store.cancelReservation(reservation.id)

      const updatedEntry = store.waitlist.find(w => w.id === entry.id)
      expect(updatedEntry?.status).toBe('assigned')
      expect(updatedEntry?.assignedReservationId).toBeDefined()
    })

    it('只有第一个候补应该转正', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const reservation = store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '原始预定'
      })

      store.setCurrentUser('2')
      store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补1')

      store.setCurrentUser('3')
      store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补2')

      store.setCurrentUser('1')
      store.cancelReservation(reservation.id)

      const firstEntry = store.waitlist.find(w => w.title === '候补1')
      const secondEntry = store.waitlist.find(w => w.title === '候补2')

      expect(firstEntry?.status).toBe('assigned')
      expect(secondEntry?.status).toBe('waiting')
    })

    it('候补转正后队列应该重新排序', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const reservation = store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '原始预定'
      })

      store.setCurrentUser('2')
      store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补1')

      store.setCurrentUser('3')
      store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补2')

      store.setCurrentUser('4')
      store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补3')

      store.setCurrentUser('1')
      store.cancelReservation(reservation.id)

      const secondEntry = store.waitlist.find(w => w.title === '候补2')
      const thirdEntry = store.waitlist.find(w => w.title === '候补3')

      expect(secondEntry?.position).toBe(1)
      expect(thirdEntry?.position).toBe(2)
    })

    it('取消预定后，不冲突的候补会转正', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const reservation1 = store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '上午预定'
      })

      store.setCurrentUser('2')
      store.addToWaitlist('1', '2024-01-01', '14:00', '15:00', '下午候补')

      store.setCurrentUser('1')
      store.cancelReservation(reservation1.id)

      const entry = store.waitlist.find(w => w.title === '下午候补')
      expect(entry?.status).toBe('assigned')
    })

    it('相同时间段的候补应该按顺序转正', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const reservation = store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '上午预定'
      })

      store.setCurrentUser('2')
      store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补1')

      store.setCurrentUser('3')
      store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补2')

      store.setCurrentUser('1')
      store.cancelReservation(reservation.id)

      const entry1 = store.waitlist.find(w => w.title === '候补1')
      const entry2 = store.waitlist.find(w => w.title === '候补2')

      expect(entry1?.status).toBe('assigned')
      expect(entry2?.status).toBe('waiting')
    })
  })

  describe('候补与周期性预定', () => {
    it('取消周期性预定中的单次应该触发候补转正', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const result = store.addRecurringReservation({
        roomId: '1',
        userId: store.currentUser.id,
        startTime: '09:00',
        endTime: '10:00',
        title: '周期性预定'
      }, '2024-01-01', {
        type: 'daily',
        interval: 1,
        maxOccurrences: 3
      })

      store.setCurrentUser('2')
      store.addToWaitlist('1', '2024-01-02', '09:00', '10:00', '候补预定')

      store.setCurrentUser('1')
      const seriesReservations = store.getReservationsBySeries(result!.series.id)
      store.cancelSingleRecurrence(seriesReservations[1].id)

      const entry = store.waitlist.find(w => w.title === '候补预定')
      expect(entry?.status).toBe('assigned')
    })
  })

  describe('候补转正后的预定属性', () => {
    it('转正后的预定应该保留原始信息', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const reservation = store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '原始预定'
      })

      store.setCurrentUser('2')
      store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补会议')

      store.setCurrentUser('1')
      store.cancelReservation(reservation.id)

      const newReservation = store.reservations.find(r => r.title === '候补会议')
      expect(newReservation?.roomId).toBe('1')
      expect(newReservation?.date).toBe('2024-01-01')
      expect(newReservation?.startTime).toBe('09:00')
      expect(newReservation?.endTime).toBe('10:00')
      expect(newReservation?.userId).toBe('2')
    })

    it('转正后的预定应该由系统批准', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const reservation = store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '原始预定'
      })

      store.setCurrentUser('2')
      store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补会议')

      store.setCurrentUser('1')
      store.cancelReservation(reservation.id)

      const newReservation = store.reservations.find(r => r.title === '候补会议')
      expect(newReservation?.approvedBy).toBe('system')
      expect(newReservation?.approvedAt).toBeDefined()
    })
  })

  describe('边界情况', () => {
    it('没有候补时不应该创建预定', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const reservation = store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '原始预定'
      })

      store.cancelReservation(reservation.id)

      const reservations = store.reservations.filter(r => r.title !== '原始预定')
      expect(reservations).toHaveLength(0)
    })

    it('取消不存在的候补条目不应报错', () => {
      const store = useStore()
      store.cancelWaitlistEntry('999')
      expect(store.waitlist).toHaveLength(0)
    })

    it('已取消的候补不应该在候补列表中', () => {
      const store = useStore()
      const entry = store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补预定')

      expect(store.waitingListEntries).toHaveLength(1)

      store.cancelWaitlistEntry(entry.id)

      expect(store.waitingListEntries).toHaveLength(0)
    })

    it('已分配的候补不应该在候补列表中', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const reservation = store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '原始预定'
      })

      store.setCurrentUser('2')
      store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补预定')

      store.setCurrentUser('1')
      store.cancelReservation(reservation.id)

      expect(store.waitingListEntries).toHaveLength(0)
    })
  })
})
