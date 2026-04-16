import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStore } from '../index'

describe('会议室预定系统 - 预定和审批流程测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('普通用户预定流程', () => {
    it('普通用户创建预定应该处于待审批状态', () => {
      const store = useStore()
      const reservation = store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '普通用户预定'
      })
      expect(reservation.status).toBe('pending')
      expect(reservation.approvedAt).toBeUndefined()
      expect(reservation.approvedBy).toBeUndefined()
    })

    it('管理员创建预定应该自动批准', () => {
      const store = useStore()
      store.setCurrentUser('1')
      const reservation = store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '管理员预定'
      })
      expect(reservation.status).toBe('approved')
      expect(reservation.approvedAt).toBeDefined()
      expect(reservation.approvedBy).toBe('1')
    })

    it('预定应该包含正确的信息', () => {
      const store = useStore()
      const reservation = store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-15',
        startTime: '14:00',
        endTime: '15:30',
        title: '项目会议'
      })
      expect(reservation.roomId).toBe('1')
      expect(reservation.userId).toBe(store.currentUser.id)
      expect(reservation.date).toBe('2024-01-15')
      expect(reservation.startTime).toBe('14:00')
      expect(reservation.endTime).toBe('15:30')
      expect(reservation.title).toBe('项目会议')
      expect(reservation.id).toBeDefined()
      expect(reservation.createdAt).toBeDefined()
    })

    it('应该能获取所有预定列表', () => {
      const store = useStore()
      store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '预定1'
      })
      store.addReservation({
        roomId: '2',
        userId: store.currentUser.id,
        date: '2024-01-02',
        startTime: '10:00',
        endTime: '11:00',
        title: '预定2'
      })
      expect(store.reservations).toHaveLength(2)
    })
  })

  describe('审批流程', () => {
    it('管理员应该能批准待审批的预定', () => {
      const store = useStore()
      const reservation = store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '待审批预定'
      })
      expect(reservation.status).toBe('pending')

      store.setCurrentUser('1')
      store.approveReservation(reservation.id)

      const approvedReservation = store.reservations.find(r => r.id === reservation.id)
      expect(approvedReservation?.status).toBe('approved')
      expect(approvedReservation?.approvedAt).toBeDefined()
      expect(approvedReservation?.approvedBy).toBe('1')
    })

    it('管理员应该能拒绝待审批的预定', () => {
      const store = useStore()
      const reservation = store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '待拒绝预定'
      })

      store.setCurrentUser('1')
      store.rejectReservation(reservation.id, '会议室维护中')

      const rejectedReservation = store.reservations.find(r => r.id === reservation.id)
      expect(rejectedReservation?.status).toBe('rejected')
      expect(rejectedReservation?.rejectReason).toBe('会议室维护中')
    })

    it('应该能获取待审批列表', () => {
      const store = useStore()
      store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '预定1'
      })
      store.addReservation({
        roomId: '2',
        userId: store.currentUser.id,
        date: '2024-01-02',
        startTime: '10:00',
        endTime: '11:00',
        title: '预定2'
      })
      expect(store.pendingReservations).toHaveLength(2)
    })

    it('批准后的预定不应出现在待审批列表', () => {
      const store = useStore()
      const reservation = store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '待审批预定'
      })
      expect(store.pendingReservations).toHaveLength(1)

      store.setCurrentUser('1')
      store.approveReservation(reservation.id)

      expect(store.pendingReservations).toHaveLength(0)
    })

    it('拒绝后的预定不应出现在待审批列表', () => {
      const store = useStore()
      const reservation = store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '待审批预定'
      })
      expect(store.pendingReservations).toHaveLength(1)

      store.setCurrentUser('1')
      store.rejectReservation(reservation.id, '时间冲突')

      expect(store.pendingReservations).toHaveLength(0)
    })

    it('批准不存在的预定不应报错', () => {
      const store = useStore()
      store.setCurrentUser('1')
      store.approveReservation('999')
      expect(store.reservations).toHaveLength(0)
    })

    it('拒绝不存在的预定不应报错', () => {
      const store = useStore()
      store.setCurrentUser('1')
      store.rejectReservation('999', '原因')
      expect(store.reservations).toHaveLength(0)
    })
  })

  describe('取消预定流程', () => {
    it('应该能取消待审批的预定', () => {
      const store = useStore()
      const reservation = store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '待取消预定'
      })
      expect(reservation.status).toBe('pending')

      store.cancelReservation(reservation.id)

      const cancelledReservation = store.reservations.find(r => r.id === reservation.id)
      expect(cancelledReservation?.status).toBe('cancelled')
    })

    it('应该能取消已批准的预定', () => {
      const store = useStore()
      store.setCurrentUser('1')
      const reservation = store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '待取消预定'
      })
      expect(reservation.status).toBe('approved')

      store.cancelReservation(reservation.id)

      const cancelledReservation = store.reservations.find(r => r.id === reservation.id)
      expect(cancelledReservation?.status).toBe('cancelled')
    })

    it('取消不存在的预定不应报错', () => {
      const store = useStore()
      store.cancelReservation('999')
      expect(store.reservations).toHaveLength(0)
    })

    it('应该能删除预定', () => {
      const store = useStore()
      const reservation = store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '待删除预定'
      })
      expect(store.reservations).toHaveLength(1)

      store.deleteReservation(reservation.id)

      expect(store.reservations).toHaveLength(0)
    })

    it('删除不存在的预定不应报错', () => {
      const store = useStore()
      store.deleteReservation('999')
      expect(store.reservations).toHaveLength(0)
    })
  })

  describe('预定查询功能', () => {
    it('应该能按用户获取预定列表', () => {
      const store = useStore()
      const userId = store.currentUser.id

      store.addReservation({
        roomId: '1',
        userId: userId,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '预定1'
      })
      store.addReservation({
        roomId: '2',
        userId: userId,
        date: '2024-01-02',
        startTime: '10:00',
        endTime: '11:00',
        title: '预定2'
      })

      const userReservations = store.getReservationsByUser(userId)
      expect(userReservations).toHaveLength(2)
    })

    it('应该按创建时间倒序排列用户预定', () => {
      const store = useStore()
      const userId = store.currentUser.id

      const res1 = store.addReservation({
        roomId: '1',
        userId: userId,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '预定1'
      })

      const res2 = store.addReservation({
        roomId: '2',
        userId: userId,
        date: '2024-01-02',
        startTime: '10:00',
        endTime: '11:00',
        title: '预定2'
      })

      const userReservations = store.getReservationsByUser(userId)
      const sortedByTime = [...userReservations].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      expect(userReservations).toEqual(sortedByTime)
    })

    it('应该能获取特定会议室和日期的已批准预定', () => {
      const store = useStore()
      store.setCurrentUser('1')

      store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '预定1'
      })
      store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '14:00',
        endTime: '15:00',
        title: '预定2'
      })

      const approvedReservations = store.getApprovedReservationsByRoomAndDate('1', '2024-01-01')
      expect(approvedReservations).toHaveLength(2)
    })

    it('应该只返回已批准的预定', () => {
      const store = useStore()

      store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '待审批预定'
      })

      const approvedReservations = store.getApprovedReservationsByRoomAndDate('1', '2024-01-01')
      expect(approvedReservations).toHaveLength(0)
    })

    it('应该能获取特定会议室和日期的活动预定', () => {
      const store = useStore()

      store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '待审批预定'
      })

      const activeReservations = store.getActiveReservationsByRoomAndDate('1', '2024-01-01')
      expect(activeReservations).toHaveLength(1)
    })

    it('活动预定应该包括待审批和已批准的', () => {
      const store = useStore()

      store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '待审批预定'
      })

      store.setCurrentUser('1')
      store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '14:00',
        endTime: '15:00',
        title: '已批准预定'
      })

      const activeReservations = store.getActiveReservationsByRoomAndDate('1', '2024-01-01')
      expect(activeReservations).toHaveLength(2)
    })
  })
})
