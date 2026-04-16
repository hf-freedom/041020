import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStore } from '../index'
import type { RecurrenceRule } from '../../types'

describe('会议室预定系统 - 基础功能测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('用户管理功能', () => {
    it('应该正确获取当前用户', () => {
      const store = useStore()
      expect(store.currentUser).toBeDefined()
      expect(store.currentUser.name).toBe('张三')
      expect(store.currentUser.role).toBe('user')
    })

    it('应该能切换当前用户', () => {
      const store = useStore()
      store.setCurrentUser('1')
      expect(store.currentUser.name).toBe('管理员')
      expect(store.currentUser.role).toBe('admin')
    })

    it('应该正确判断是否为管理员', () => {
      const store = useStore()
      expect(store.isAdmin).toBe(false)
      store.setCurrentUser('1')
      expect(store.isAdmin).toBe(true)
    })

    it('切换不存在的用户不应改变当前用户', () => {
      const store = useStore()
      const originalUser = store.currentUser
      store.setCurrentUser('999')
      expect(store.currentUser).toEqual(originalUser)
    })
  })

  describe('会议室管理功能', () => {
    it('应该正确获取所有会议室', () => {
      const store = useStore()
      expect(store.rooms).toHaveLength(5)
      expect(store.rooms[0].name).toBe('会议室A')
    })

    it('应该正确获取可用会议室', () => {
      const store = useStore()
      expect(store.availableRooms).toHaveLength(5)
    })

    it('应该能添加新会议室', () => {
      const store = useStore()
      const newRoom = store.addRoom({
        name: '新会议室',
        location: '3楼302',
        disabled: false,
        openTimeStart: '08:00',
        openTimeEnd: '18:00'
      })
      expect(newRoom).toBeDefined()
      expect(newRoom.name).toBe('新会议室')
      expect(newRoom.id).toBeDefined()
      expect(store.rooms).toHaveLength(6)
    })

    it('应该能更新会议室信息', () => {
      const store = useStore()
      store.updateRoom('1', { name: '更新后的会议室A' })
      expect(store.rooms.find(r => r.id === '1')?.name).toBe('更新后的会议室A')
    })

    it('应该能删除会议室', () => {
      const store = useStore()
      const initialRoomCount = store.rooms.length
      const roomToDelete = store.rooms[0]
      store.deleteRoom(roomToDelete.id)
      expect(store.rooms).toHaveLength(initialRoomCount - 1)
      expect(store.rooms.find(r => r.id === roomToDelete.id)).toBeUndefined()
    })

    it('更新不存在的会议室不应报错', () => {
      const store = useStore()
      store.updateRoom('999', { name: '不存在的会议室' })
      expect(store.rooms).toHaveLength(5)
    })

    it('删除不存在的会议室不应报错', () => {
      const store = useStore()
      store.deleteRoom('999')
      expect(store.rooms).toHaveLength(5)
    })
  })

  describe('预定查询功能', () => {
    it('初始状态应该没有预定', () => {
      const store = useStore()
      expect(store.reservations).toHaveLength(0)
    })

    it('应该能获取用户的预定列表', () => {
      const store = useStore()
      const userId = store.currentUser.id
      const reservations = store.getReservationsByUser(userId)
      expect(reservations).toHaveLength(0)
    })

    it('应该能获取特定日期和会议室的已批准预定', () => {
      const store = useStore()
      const reservations = store.getApprovedReservationsByRoomAndDate('1', '2024-01-01')
      expect(reservations).toHaveLength(0)
    })

    it('应该能获取特定日期和会议室的活动预定', () => {
      const store = useStore()
      const reservations = store.getActiveReservationsByRoomAndDate('1', '2024-01-01')
      expect(reservations).toHaveLength(0)
    })

    it('应该能获取用户的候补列表', () => {
      const store = useStore()
      const userId = store.currentUser.id
      const waitlist = store.getWaitlistByUser(userId)
      expect(waitlist).toHaveLength(0)
    })
  })

  describe('时间冲突检测功能', () => {
    it('没有预定时应该没有冲突', () => {
      const store = useStore()
      const hasConflict = store.checkTimeConflict('1', '2024-01-01', '09:00', '10:00')
      expect(hasConflict).toBe(false)
    })

    it('相同时间段应该有冲突', () => {
      const store = useStore()
      store.setCurrentUser('1')
      store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '测试预定'
      })
      const hasConflict = store.checkTimeConflict('1', '2024-01-01', '09:00', '10:00')
      expect(hasConflict).toBe(true)
    })

    it('部分重叠的时间段应该有冲突', () => {
      const store = useStore()
      store.setCurrentUser('1')
      store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '11:00',
        title: '测试预定'
      })
      const hasConflict = store.checkTimeConflict('1', '2024-01-01', '10:00', '12:00')
      expect(hasConflict).toBe(true)
    })

    it('不重叠的时间段应该没有冲突', () => {
      const store = useStore()
      store.setCurrentUser('1')
      store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '测试预定'
      })
      const hasConflict = store.checkTimeConflict('1', '2024-01-01', '10:00', '11:00')
      expect(hasConflict).toBe(false)
    })

    it('排除指定ID时不应该检测到冲突', () => {
      const store = useStore()
      store.setCurrentUser('1')
      const reservation = store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '测试预定'
      })
      const hasConflict = store.checkTimeConflict('1', '2024-01-01', '09:00', '10:00', reservation.id)
      expect(hasConflict).toBe(false)
    })

    it('不同日期不应该有冲突', () => {
      const store = useStore()
      store.setCurrentUser('1')
      store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '测试预定'
      })
      const hasConflict = store.checkTimeConflict('1', '2024-01-02', '09:00', '10:00')
      expect(hasConflict).toBe(false)
    })

    it('不同会议室不应该有冲突', () => {
      const store = useStore()
      store.setCurrentUser('1')
      store.addReservation({
        roomId: '1',
        userId: store.currentUser.id,
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '测试预定'
      })
      const hasConflict = store.checkTimeConflict('2', '2024-01-01', '09:00', '10:00')
      expect(hasConflict).toBe(false)
    })
  })
})
