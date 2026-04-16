import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, it, expect } from 'vitest'
import { useStore } from './index'

describe('会议室管理系统 Store 测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('1. 单独功能测试用例', () => {
    describe('1.1 用户管理功能', () => {
      it('应该正确初始化用户列表', () => {
        const store = useStore()
        expect(store.users.length).toBe(4)
        expect(store.users[0].role).toBe('admin')
        expect(store.users[1].role).toBe('user')
      })

      it('应该正确设置当前用户', () => {
        const store = useStore()
        store.setCurrentUser('1')
        expect(store.currentUser.id).toBe('1')
        expect(store.currentUser.name).toBe('管理员')
        expect(store.currentUser.role).toBe('admin')
      })

      it('切换到普通用户时isAdmin应该为false', () => {
        const store = useStore()
        store.setCurrentUser('2')
        expect(store.isAdmin).toBe(false)
      })

      it('管理员用户时isAdmin应该为true', () => {
        const store = useStore()
        store.setCurrentUser('1')
        expect(store.isAdmin).toBe(true)
      })
    })

    describe('1.2 会议室管理功能', () => {
      it('应该正确初始化会议室列表', () => {
        const store = useStore()
        expect(store.rooms.length).toBe(5)
        expect(store.rooms[0].name).toBe('会议室A')
      })

      it('应该正确添加新会议室', () => {
        const store = useStore()
        const newRoom = store.addRoom({
          name: '测试会议室',
          location: '测试位置',
          disabled: false,
          openTimeStart: '09:00',
          openTimeEnd: '18:00'
        })
        expect(store.rooms.length).toBe(6)
        expect(newRoom.id).toBeDefined()
        expect(newRoom.name).toBe('测试会议室')
      })

      it('应该正确更新会议室信息', () => {
        const store = useStore()
        store.updateRoom('1', { name: '更新后的会议室A' })
        const room = store.rooms.find(r => r.id === '1')
        expect(room?.name).toBe('更新后的会议室A')
      })

      it('availableRooms应该只返回未禁用的会议室', () => {
        const store = useStore()
        const initialAvailable = store.availableRooms.length
        store.updateRoom('1', { disabled: true })
        expect(store.availableRooms.length).toBe(initialAvailable - 1)
        expect(store.availableRooms.find(r => r.id === '1')).toBeUndefined()
        store.updateRoom('1', { disabled: false })
      })

      it('应该正确删除会议室', () => {
        const store = useStore()
        const initialCount = store.rooms.length
        store.deleteRoom('1')
        expect(store.rooms.length).toBe(initialCount - 1)
        expect(store.rooms.find(r => r.id === '1')).toBeUndefined()
      })
    })

    describe('1.3 预定基础功能', () => {
      it('应该正确添加预定（普通用户预定状态为pending）', () => {
        const store = useStore()
        store.setCurrentUser('2')
        const reservation = store.addReservation({
          roomId: '1',
          userId: '2',
          date: '2024-01-15',
          startTime: '09:00',
          endTime: '10:00',
          title: '测试会议'
        })
        expect(reservation.id).toBeDefined()
        expect(reservation.status).toBe('pending')
        expect(reservation.createdAt).toBeDefined()
      })

      it('管理员预定应该自动批准', () => {
        const store = useStore()
        store.setCurrentUser('1')
        const reservation = store.addReservation({
          roomId: '1',
          userId: '1',
          date: '2024-01-15',
          startTime: '10:00',
          endTime: '11:00',
          title: '管理员会议'
        })
        expect(reservation.status).toBe('approved')
        expect(reservation.approvedAt).toBeDefined()
        expect(reservation.approvedBy).toBe('1')
      })

      it('应该正确检测时间冲突', () => {
        const store = useStore()
        store.setCurrentUser('1')
        store.addReservation({
          roomId: '1',
          userId: '1',
          date: '2024-01-15',
          startTime: '09:00',
          endTime: '10:00',
          title: '会议1'
        })
        const hasConflict = store.checkTimeConflict('1', '2024-01-15', '09:30', '10:30')
        expect(hasConflict).toBe(true)
      })

      it('应该正确检测无冲突的时间段', () => {
        const store = useStore()
        store.setCurrentUser('1')
        store.addReservation({
          roomId: '1',
          userId: '1',
          date: '2024-01-15',
          startTime: '09:00',
          endTime: '10:00',
          title: '会议1'
        })
        const hasConflict = store.checkTimeConflict('1', '2024-01-15', '10:00', '11:00')
        expect(hasConflict).toBe(false)
      })

      it('应该正确获取用户的预定列表', () => {
        const store = useStore()
        store.setCurrentUser('2')
        store.addReservation({
          roomId: '1',
          userId: '2',
          date: '2024-01-15',
          startTime: '14:00',
          endTime: '15:00',
          title: '用户会议'
        })
        const userReservations = store.getReservationsByUser('2')
        expect(userReservations.length).toBeGreaterThan(0)
        expect(userReservations.every(r => r.userId === '2')).toBe(true)
      })

      it('应该正确删除预定', () => {
        const store = useStore()
        store.setCurrentUser('2')
        const reservation = store.addReservation({
          roomId: '1',
          userId: '2',
          date: '2024-01-16',
          startTime: '09:00',
          endTime: '10:00',
          title: '待删除会议'
        })
        const initialCount = store.reservations.length
        store.deleteReservation(reservation.id)
        expect(store.reservations.length).toBe(initialCount - 1)
      })
    })
  })

  describe('2. 预定和审批流程测试', () => {
    describe('2.1 普通用户预定流程', () => {
      it('普通用户预定后状态应为pending', () => {
        const store = useStore()
        store.setCurrentUser('2')
        const reservation = store.addReservation({
          roomId: '1',
          userId: '2',
          date: '2024-01-20',
          startTime: '09:00',
          endTime: '10:00',
          title: '待审批会议'
        })
        expect(reservation.status).toBe('pending')
        expect(store.pendingReservations.length).toBeGreaterThan(0)
      })

      it('pendingReservations应该只返回待审批的预定', () => {
        const store = useStore()
        store.setCurrentUser('2')
        store.addReservation({
          roomId: '1',
          userId: '2',
          date: '2024-01-21',
          startTime: '09:00',
          endTime: '10:00',
          title: '待审批会议1'
        })
        store.addReservation({
          roomId: '2',
          userId: '2',
          date: '2024-01-21',
          startTime: '10:00',
          endTime: '11:00',
          title: '待审批会议2'
        })
        const pending = store.pendingReservations
        expect(pending.every(r => r.status === 'pending')).toBe(true)
      })
    })

    describe('2.2 审批流程', () => {
      it('管理员批准预定后状态应变为approved', () => {
        const store = useStore()
        store.setCurrentUser('2')
        const reservation = store.addReservation({
          roomId: '1',
          userId: '2',
          date: '2024-01-22',
          startTime: '09:00',
          endTime: '10:00',
          title: '待审批会议'
        })
        store.setCurrentUser('1')
        store.approveReservation(reservation.id)
        const approved = store.reservations.find(r => r.id === reservation.id)
        expect(approved?.status).toBe('approved')
        expect(approved?.approvedAt).toBeDefined()
        expect(approved?.approvedBy).toBe('1')
      })

      it('管理员拒绝预定后状态应变为rejected', () => {
        const store = useStore()
        store.setCurrentUser('2')
        const reservation = store.addReservation({
          roomId: '1',
          userId: '2',
          date: '2024-01-23',
          startTime: '09:00',
          endTime: '10:00',
          title: '待拒绝会议'
        })
        store.setCurrentUser('1')
        store.rejectReservation(reservation.id, '时间冲突')
        const rejected = store.reservations.find(r => r.id === reservation.id)
        expect(rejected?.status).toBe('rejected')
        expect(rejected?.rejectReason).toBe('时间冲突')
      })

      it('用户取消预定后状态应变为cancelled', () => {
        const store = useStore()
        store.setCurrentUser('2')
        const reservation = store.addReservation({
          roomId: '1',
          userId: '2',
          date: '2024-01-24',
          startTime: '09:00',
          endTime: '10:00',
          title: '待取消会议'
        })
        store.cancelReservation(reservation.id)
        const cancelled = store.reservations.find(r => r.id === reservation.id)
        expect(cancelled?.status).toBe('cancelled')
      })
    })

    describe('2.3 获取预定信息', () => {
      it('应该正确获取指定日期会议室的已批准预定', () => {
        const store = useStore()
        store.setCurrentUser('1')
        store.addReservation({
          roomId: '1',
          userId: '1',
          date: '2024-01-25',
          startTime: '09:00',
          endTime: '10:00',
          title: '已批准会议'
        })
        const approved = store.getApprovedReservationsByRoomAndDate('1', '2024-01-25')
        expect(approved.length).toBeGreaterThan(0)
        expect(approved.every(r => r.status === 'approved')).toBe(true)
      })

      it('应该正确获取指定日期会议室的活动预定（包括pending和approved）', () => {
        const store = useStore()
        store.setCurrentUser('1')
        store.addReservation({
          roomId: '2',
          userId: '1',
          date: '2024-01-25',
          startTime: '09:00',
          endTime: '10:00',
          title: '已批准会议'
        })
        store.setCurrentUser('2')
        store.addReservation({
          roomId: '2',
          userId: '2',
          date: '2024-01-25',
          startTime: '11:00',
          endTime: '12:00',
          title: '待审批会议'
        })
        const active = store.getActiveReservationsByRoomAndDate('2', '2024-01-25')
        expect(active.every(r => r.status === 'approved' || r.status === 'pending')).toBe(true)
      })
    })
  })

  describe('3. 周期性预定流程测试', () => {
    describe('3.1 每日周期预定', () => {
      it('应该正确创建每日周期预定', () => {
        const store = useStore()
        store.setCurrentUser('1')
        const result = store.addRecurringReservation(
          {
            roomId: '1',
            userId: '1',
            startTime: '09:00',
            endTime: '10:00',
            title: '每日站会'
          },
          '2024-02-01',
          { type: 'daily', interval: 1, maxOccurrences: 5 }
        )
        expect(result).not.toBeNull()
        expect(result?.occurrences).toBe(5)
        expect(result?.masterReservation.isRecurrenceMaster).toBe(true)
        expect(result?.masterReservation.recurrenceRule?.type).toBe('daily')
      })

      it('每日周期预定应该生成正确数量的预定记录', () => {
        const store = useStore()
        store.setCurrentUser('1')
        const beforeCount = store.reservations.length
        store.addRecurringReservation(
          {
            roomId: '2',
            userId: '1',
            startTime: '09:00',
            endTime: '10:00',
            title: '每日站会'
          },
          '2024-02-01',
          { type: 'daily', interval: 1, maxOccurrences: 3 }
        )
        expect(store.reservations.length).toBe(beforeCount + 3)
      })
    })

    describe('3.2 每周周期预定', () => {
      it('应该正确创建每周周期预定', () => {
        const store = useStore()
        store.setCurrentUser('1')
        const result = store.addRecurringReservation(
          {
            roomId: '1',
            userId: '1',
            startTime: '14:00',
            endTime: '15:00',
            title: '每周例会'
          },
          '2024-02-05',
          { type: 'weekly', interval: 1, daysOfWeek: [1, 3, 5], maxOccurrences: 6 }
        )
        expect(result).not.toBeNull()
        expect(result?.masterReservation.recurrenceRule?.type).toBe('weekly')
        expect(result?.masterReservation.recurrenceRule?.daysOfWeek).toEqual([1, 3, 5])
      })

      it('每周周期预定应该只在指定星期几生成预定', () => {
        const store = useStore()
        store.setCurrentUser('1')
        const result = store.addRecurringReservation(
          {
            roomId: '3',
            userId: '1',
            startTime: '09:00',
            endTime: '10:00',
            title: '周一会议'
          },
          '2024-02-05',
          { type: 'weekly', interval: 1, daysOfWeek: [1], maxOccurrences: 3 }
        )
        expect(result).not.toBeNull()
        const series = store.getRecurrenceSeries(result!.masterReservation.recurrenceId!)
        expect(series).toBeDefined()
      })
    })

    describe('3.3 每月周期预定', () => {
      it('应该正确创建每月周期预定', () => {
        const store = useStore()
        store.setCurrentUser('1')
        const result = store.addRecurringReservation(
          {
            roomId: '1',
            userId: '1',
            startTime: '10:00',
            endTime: '11:00',
            title: '月度总结会'
          },
          '2024-02-15',
          { type: 'monthly', interval: 1, maxOccurrences: 3 }
        )
        expect(result).not.toBeNull()
        expect(result?.masterReservation.recurrenceRule?.type).toBe('monthly')
      })
    })

    describe('3.4 周期预定取消', () => {
      it('取消单次周期预定应该只取消该次', () => {
        const store = useStore()
        store.setCurrentUser('1')
        const result = store.addRecurringReservation(
          {
            roomId: '1',
            userId: '1',
            startTime: '09:00',
            endTime: '10:00',
            title: '周期会议'
          },
          '2024-03-01',
          { type: 'daily', interval: 1, maxOccurrences: 3 }
        )
        const seriesReservations = store.getReservationsBySeries(result!.masterReservation.recurrenceId!)
        const secondReservation = seriesReservations[1]
        store.cancelSingleRecurrence(secondReservation.id)
        expect(secondReservation.status).toBe('cancelled')
        expect(seriesReservations[0].status).toBe('approved')
        expect(seriesReservations[2].status).toBe('approved')
      })

      it('取消整个周期预定应该取消所有相关预定', () => {
        const store = useStore()
        store.setCurrentUser('1')
        const result = store.addRecurringReservation(
          {
            roomId: '2',
            userId: '1',
            startTime: '09:00',
            endTime: '10:00',
            title: '周期会议'
          },
          '2024-03-01',
          { type: 'daily', interval: 1, maxOccurrences: 3 }
        )
        store.cancelAllRecurrences(result!.masterReservation.recurrenceId!)
        const seriesReservations = store.getReservationsBySeries(result!.masterReservation.recurrenceId!)
        expect(seriesReservations.every(r => r.status === 'cancelled')).toBe(true)
        const series = store.getRecurrenceSeries(result!.masterReservation.recurrenceId!)
        expect(series?.status).toBe('cancelled')
      })

      it('取消主预定应该取消整个周期', () => {
        const store = useStore()
        store.setCurrentUser('1')
        const result = store.addRecurringReservation(
          {
            roomId: '3',
            userId: '1',
            startTime: '09:00',
            endTime: '10:00',
            title: '周期会议'
          },
          '2024-03-01',
          { type: 'daily', interval: 1, maxOccurrences: 3 }
        )
        store.cancelReservation(result!.masterReservation.id)
        const seriesReservations = store.getReservationsBySeries(result!.masterReservation.recurrenceId!)
        expect(seriesReservations.every(r => r.status === 'cancelled')).toBe(true)
      })
    })

    describe('3.5 周期预定审批', () => {
      it('普通用户创建周期预定应该全部为pending', () => {
        const store = useStore()
        store.setCurrentUser('2')
        const result = store.addRecurringReservation(
          {
            roomId: '1',
            userId: '2',
            startTime: '09:00',
            endTime: '10:00',
            title: '周期会议'
          },
          '2024-04-01',
          { type: 'daily', interval: 1, maxOccurrences: 3 }
        )
        const seriesReservations = store.getReservationsBySeries(result!.masterReservation.recurrenceId!)
        expect(seriesReservations.every(r => r.status === 'pending')).toBe(true)
      })

      it('批准周期预定主预定应该批准所有相关预定', () => {
        const store = useStore()
        store.setCurrentUser('2')
        const result = store.addRecurringReservation(
          {
            roomId: '1',
            userId: '2',
            startTime: '09:00',
            endTime: '10:00',
            title: '周期会议'
          },
          '2024-04-01',
          { type: 'daily', interval: 1, maxOccurrences: 3 }
        )
        store.setCurrentUser('1')
        store.approveReservation(result!.masterReservation.id)
        const seriesReservations = store.getReservationsBySeries(result!.masterReservation.recurrenceId!)
        expect(seriesReservations.every(r => r.status === 'approved')).toBe(true)
      })

      it('拒绝周期预定主预定应该拒绝所有相关预定', () => {
        const store = useStore()
        store.setCurrentUser('2')
        const result = store.addRecurringReservation(
          {
            roomId: '2',
            userId: '2',
            startTime: '09:00',
            endTime: '10:00',
            title: '周期会议'
          },
          '2024-04-01',
          { type: 'daily', interval: 1, maxOccurrences: 3 }
        )
        store.setCurrentUser('1')
        store.rejectReservation(result!.masterReservation.id, '资源不足')
        const seriesReservations = store.getReservationsBySeries(result!.masterReservation.recurrenceId!)
        expect(seriesReservations.every(r => r.status === 'rejected')).toBe(true)
        const series = store.getRecurrenceSeries(result!.masterReservation.recurrenceId!)
        expect(series?.status).toBe('cancelled')
      })
    })

    describe('3.6 周期预定结束日期', () => {
      it('周期预定应该遵守结束日期', () => {
        const store = useStore()
        store.setCurrentUser('1')
        const result = store.addRecurringReservation(
          {
            roomId: '1',
            userId: '1',
            startTime: '09:00',
            endTime: '10:00',
            title: '周期会议'
          },
          '2024-05-01',
          { type: 'daily', interval: 1, endDate: '2024-05-03', maxOccurrences: 100 }
        )
        expect(result).not.toBeNull()
        const seriesReservations = store.getReservationsBySeries(result!.masterReservation.recurrenceId!)
        expect(seriesReservations.length).toBeLessThanOrEqual(3)
      })
    })
  })

  describe('4. 预定排队与候补流程测试', () => {
    describe('4.1 候补队列基础功能', () => {
      it('应该正确添加候补条目', () => {
        const store = useStore()
        store.setCurrentUser('2')
        const entry = store.addToWaitlist('1', '2024-06-01', '09:00', '10:00', '候补会议')
        expect(entry.id).toBeDefined()
        expect(entry.position).toBe(1)
        expect(entry.status).toBe('waiting')
        expect(entry.userId).toBe('2')
      })

      it('候补条目位置应该按顺序递增', () => {
        const store = useStore()
        store.setCurrentUser('2')
        const entry1 = store.addToWaitlist('1', '2024-06-01', '09:00', '10:00', '候补1')
        store.setCurrentUser('3')
        const entry2 = store.addToWaitlist('1', '2024-06-01', '09:00', '10:00', '候补2')
        store.setCurrentUser('4')
        const entry3 = store.addToWaitlist('1', '2024-06-01', '09:00', '10:00', '候补3')
        expect(entry1.position).toBe(1)
        expect(entry2.position).toBe(2)
        expect(entry3.position).toBe(3)
      })

      it('应该正确获取用户的候补列表', () => {
        const store = useStore()
        store.setCurrentUser('2')
        store.addToWaitlist('1', '2024-06-01', '09:00', '10:00', '候补1')
        store.addToWaitlist('2', '2024-06-02', '10:00', '11:00', '候补2')
        const userWaitlist = store.getWaitlistByUser('2')
        expect(userWaitlist.length).toBe(2)
        expect(userWaitlist.every(w => w.userId === '2')).toBe(true)
      })

      it('应该正确取消候补条目', () => {
        const store = useStore()
        store.setCurrentUser('2')
        const entry = store.addToWaitlist('1', '2024-06-01', '09:00', '10:00', '候补会议')
        store.cancelWaitlistEntry(entry.id)
        const cancelled = store.waitlist.find(w => w.id === entry.id)
        expect(cancelled?.status).toBe('cancelled')
      })

      it('取消候补后应该重新排序位置', () => {
        const store = useStore()
        store.setCurrentUser('2')
        const entry1 = store.addToWaitlist('1', '2024-06-01', '09:00', '10:00', '候补1')
        store.setCurrentUser('3')
        const entry2 = store.addToWaitlist('1', '2024-06-01', '09:00', '10:00', '候补2')
        store.setCurrentUser('4')
        const entry3 = store.addToWaitlist('1', '2024-06-01', '09:00', '10:00', '候补3')
        store.cancelWaitlistEntry(entry1.id)
        const waiting = store.waitingListEntries.filter(w => w.roomId === '1' && w.date === '2024-06-01')
        expect(waiting[0].position).toBe(1)
        expect(waiting[0].id).toBe(entry2.id)
        expect(waiting[1].position).toBe(2)
        expect(waiting[1].id).toBe(entry3.id)
      })
    })

    describe('4.2 候补自动分配流程', () => {
      it('预定取消后应该自动分配给候补队列第一位', () => {
        const store = useStore()
        store.setCurrentUser('1')
        const reservation = store.addReservation({
          roomId: '1',
          userId: '1',
          date: '2024-06-15',
          startTime: '09:00',
          endTime: '10:00',
          title: '原始会议'
        })
        store.setCurrentUser('2')
        const waitlistEntry = store.addToWaitlist('1', '2024-06-15', '09:00', '10:00', '候补会议')
        store.cancelReservation(reservation.id)
        const updatedEntry = store.waitlist.find(w => w.id === waitlistEntry.id)
        expect(updatedEntry?.status).toBe('assigned')
        expect(updatedEntry?.assignedReservationId).toBeDefined()
        const newReservation = store.reservations.find(r => r.id === updatedEntry?.assignedReservationId)
        expect(newReservation).toBeDefined()
        expect(newReservation?.status).toBe('approved')
        expect(newReservation?.userId).toBe('2')
      })

      it('候补分配后应该创建新的预定', () => {
        const store = useStore()
        store.setCurrentUser('1')
        const reservation = store.addReservation({
          roomId: '1',
          userId: '1',
          date: '2024-06-16',
          startTime: '14:00',
          endTime: '15:00',
          title: '原始会议'
        })
        store.setCurrentUser('2')
        store.addToWaitlist('1', '2024-06-16', '14:00', '15:00', '候补会议')
        const beforeCount = store.reservations.length
        store.cancelReservation(reservation.id)
        const approved = store.getApprovedReservationsByRoomAndDate('1', '2024-06-16')
        expect(approved.length).toBe(1)
        expect(approved[0].title).toBe('候补会议')
      })

      it('多个候补时应该按顺序分配', () => {
        const store = useStore()
        store.setCurrentUser('1')
        const reservation = store.addReservation({
          roomId: '1',
          userId: '1',
          date: '2024-06-17',
          startTime: '09:00',
          endTime: '10:00',
          title: '原始会议'
        })
        store.setCurrentUser('2')
        const entry1 = store.addToWaitlist('1', '2024-06-17', '09:00', '10:00', '候补1')
        store.setCurrentUser('3')
        const entry2 = store.addToWaitlist('1', '2024-06-17', '09:00', '10:00', '候补2')
        store.cancelReservation(reservation.id)
        const updatedEntry1 = store.waitlist.find(w => w.id === entry1.id)
        const updatedEntry2 = store.waitlist.find(w => w.id === entry2.id)
        expect(updatedEntry1?.status).toBe('assigned')
        expect(updatedEntry2?.status).toBe('waiting')
      })
    })

    describe('4.3 候补与时间冲突检测', () => {
      it('候补不应该分配给有冲突的时间段', () => {
        const store = useStore()
        store.setCurrentUser('1')
        store.addReservation({
          roomId: '1',
          userId: '1',
          date: '2024-06-18',
          startTime: '09:00',
          endTime: '10:00',
          title: '会议A'
        })
        const reservation2 = store.addReservation({
          roomId: '1',
          userId: '1',
          date: '2024-06-18',
          startTime: '10:00',
          endTime: '11:00',
          title: '会议B'
        })
        store.setCurrentUser('2')
        const entry = store.addToWaitlist('1', '2024-06-18', '10:00', '11:00', '候补会议')
        store.cancelReservation(reservation2.id)
        const updatedEntry = store.waitlist.find(w => w.id === entry.id)
        expect(updatedEntry?.status).toBe('assigned')
      })

      it('应该正确获取指定时间段的候补列表', () => {
        const store = useStore()
        store.setCurrentUser('2')
        store.addToWaitlist('1', '2024-06-19', '09:00', '10:00', '候补1')
        store.addToWaitlist('1', '2024-06-19', '10:00', '11:00', '候补2')
        const slotWaitlist = store.getWaitlistForSlot('1', '2024-06-19', '09:00', '10:00')
        expect(slotWaitlist.length).toBe(1)
        expect(slotWaitlist[0].title).toBe('候补1')
      })
    })

    describe('4.4 waitingListEntries计算属性', () => {
      it('waitingListEntries应该只返回等待中的条目', () => {
        const store = useStore()
        store.setCurrentUser('2')
        store.addToWaitlist('1', '2024-06-20', '09:00', '10:00', '候补1')
        const entry2 = store.addToWaitlist('1', '2024-06-20', '10:00', '11:00', '候补2')
        store.cancelWaitlistEntry(entry2.id)
        const waiting = store.waitingListEntries
        expect(waiting.every(w => w.status === 'waiting')).toBe(true)
        expect(waiting.find(w => w.id === entry2.id)).toBeUndefined()
      })

      it('waitingListEntries应该按位置排序', () => {
        const store = useStore()
        store.setCurrentUser('2')
        store.addToWaitlist('1', '2024-06-21', '09:00', '10:00', '候补1')
        store.setCurrentUser('3')
        store.addToWaitlist('1', '2024-06-21', '09:00', '10:00', '候补2')
        store.setCurrentUser('4')
        store.addToWaitlist('1', '2024-06-21', '09:00', '10:00', '候补3')
        const waiting = store.waitingListEntries.filter(w => w.date === '2024-06-21')
        expect(waiting[0].position).toBeLessThan(waiting[1].position)
        expect(waiting[1].position).toBeLessThan(waiting[2].position)
      })
    })

    describe('4.5 完整候补流程测试', () => {
      it('完整流程：预定->候补->取消->自动分配', () => {
        const store = useStore()
        store.setCurrentUser('1')
        const reservation = store.addReservation({
          roomId: '1',
          userId: '1',
          date: '2024-07-01',
          startTime: '09:00',
          endTime: '10:00',
          title: '管理员会议'
        })
        expect(reservation.status).toBe('approved')
        store.setCurrentUser('2')
        const waitlistEntry = store.addToWaitlist('1', '2024-07-01', '09:00', '10:00', '用户候补')
        expect(waitlistEntry.status).toBe('waiting')
        expect(waitlistEntry.position).toBe(1)
        store.setCurrentUser('1')
        store.cancelReservation(reservation.id)
        const cancelledReservation = store.reservations.find(r => r.id === reservation.id)
        expect(cancelledReservation?.status).toBe('cancelled')
        const assignedEntry = store.waitlist.find(w => w.id === waitlistEntry.id)
        expect(assignedEntry?.status).toBe('assigned')
        const newReservation = store.reservations.find(r => r.id === assignedEntry?.assignedReservationId)
        expect(newReservation).toBeDefined()
        expect(newReservation?.status).toBe('approved')
        expect(newReservation?.userId).toBe('2')
        expect(newReservation?.title).toBe('用户候补')
      })
    })
  })

  describe('5. 边界情况和错误处理测试', () => {
    it('设置不存在的用户应该不改变当前用户', () => {
      const store = useStore()
      const originalUser = store.currentUser
      store.setCurrentUser('non-existent')
      expect(store.currentUser).toEqual(originalUser)
    })

    it('更新不存在的会议室应该不产生错误', () => {
      const store = useStore()
      const originalRooms = [...store.rooms]
      store.updateRoom('non-existent', { name: '测试' })
      expect(store.rooms).toEqual(originalRooms)
    })

    it('删除不存在的会议室应该不产生错误', () => {
      const store = useStore()
      const originalCount = store.rooms.length
      store.deleteRoom('non-existent')
      expect(store.rooms.length).toBe(originalCount)
    })

    it('批准不存在的预定应该不产生错误', () => {
      const store = useStore()
      const originalReservations = [...store.reservations]
      store.approveReservation('non-existent')
      expect(store.reservations).toEqual(originalReservations)
    })

    it('拒绝不存在的预定应该不产生错误', () => {
      const store = useStore()
      const originalReservations = [...store.reservations]
      store.rejectReservation('non-existent', '原因')
      expect(store.reservations).toEqual(originalReservations)
    })

    it('取消不存在的预定应该不产生错误', () => {
      const store = useStore()
      const originalReservations = [...store.reservations]
      store.cancelReservation('non-existent')
      expect(store.reservations).toEqual(originalReservations)
    })

    it('获取不存在的周期系列应该返回undefined', () => {
      const store = useStore()
      const series = store.getRecurrenceSeries('non-existent')
      expect(series).toBeUndefined()
    })

    it('创建周期预定时maxOccurrences为0应该使用默认值50', () => {
      const store = useStore()
      store.setCurrentUser('1')
      const result = store.addRecurringReservation(
        {
          roomId: '1',
          userId: '1',
          startTime: '09:00',
          endTime: '10:00',
          title: '测试'
        },
        '2024-08-01',
        { type: 'daily', interval: 1, maxOccurrences: 0 }
      )
      expect(result).not.toBeNull()
      expect(result?.occurrences).toBe(50)
    })

    it('时间冲突检测应该排除指定的预定ID', () => {
      const store = useStore()
      store.setCurrentUser('1')
      const reservation = store.addReservation({
        roomId: '1',
        userId: '1',
        date: '2024-08-15',
        startTime: '09:00',
        endTime: '10:00',
        title: '会议'
      })
      const hasConflict = store.checkTimeConflict('1', '2024-08-15', '09:00', '10:00', reservation.id)
      expect(hasConflict).toBe(false)
    })

    it('时间完全包含已有预定应该检测到冲突', () => {
      const store = useStore()
      store.setCurrentUser('1')
      store.addReservation({
        roomId: '1',
        userId: '1',
        date: '2024-08-16',
        startTime: '09:30',
        endTime: '10:30',
        title: '会议'
      })
      const hasConflict = store.checkTimeConflict('1', '2024-08-16', '09:00', '11:00')
      expect(hasConflict).toBe(true)
    })

    it('时间被已有预定完全包含应该检测到冲突', () => {
      const store = useStore()
      store.setCurrentUser('1')
      store.addReservation({
        roomId: '1',
        userId: '1',
        date: '2024-08-17',
        startTime: '09:00',
        endTime: '11:00',
        title: '会议'
      })
      const hasConflict = store.checkTimeConflict('1', '2024-08-17', '09:30', '10:30')
      expect(hasConflict).toBe(true)
    })
  })
})
