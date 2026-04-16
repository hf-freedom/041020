import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStore } from '../index'
import type { RecurrenceRule } from '../../types'

describe('会议室预定系统 - 周期性预定流程测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('每日重复预定', () => {
    it('应该能创建每日重复预定', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const rule: RecurrenceRule = {
        type: 'daily',
        interval: 1,
        endDate: '2024-01-05',
        maxOccurrences: 10
      }

      const result = store.addRecurringReservation({
        roomId: '1',
        userId: store.currentUser.id,
        startTime: '09:00',
        endTime: '10:00',
        title: '每日站会'
      }, '2024-01-01', rule)

      expect(result).toBeDefined()
      expect(result?.occurrences).toBe(5)
      expect(result?.masterReservation).toBeDefined()
      expect(result?.series).toBeDefined()
    })

    it('每日重复预定应该生成正确的日期', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const rule: RecurrenceRule = {
        type: 'daily',
        interval: 1,
        endDate: '2024-01-03'
      }

      const result = store.addRecurringReservation({
        roomId: '1',
        userId: store.currentUser.id,
        startTime: '09:00',
        endTime: '10:00',
        title: '每日会议'
      }, '2024-01-01', rule)

      expect(result?.series.occurrences).toEqual(['2024-01-01', '2024-01-02', '2024-01-03'])
    })

    it('间隔2天的重复预定应该生成正确的日期', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const rule: RecurrenceRule = {
        type: 'daily',
        interval: 2,
        maxOccurrences: 3
      }

      const result = store.addRecurringReservation({
        roomId: '1',
        userId: store.currentUser.id,
        startTime: '09:00',
        endTime: '10:00',
        title: '隔日会议'
      }, '2024-01-01', rule)

      expect(result?.series.occurrences).toEqual(['2024-01-01', '2024-01-03', '2024-01-05'])
    })
  })

  describe('每周重复预定', () => {
    it('应该能创建每周重复预定', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const rule: RecurrenceRule = {
        type: 'weekly',
        interval: 1,
        maxOccurrences: 4
      }

      const result = store.addRecurringReservation({
        roomId: '1',
        userId: store.currentUser.id,
        startTime: '14:00',
        endTime: '15:00',
        title: '周例会'
      }, '2024-01-01', rule)

      expect(result).toBeDefined()
      expect(result?.occurrences).toBe(4)
    })

    it('应该能创建指定星期几的重复预定', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const rule: RecurrenceRule = {
        type: 'weekly',
        interval: 1,
        daysOfWeek: [1, 3, 5],
        maxOccurrences: 10
      }

      const result = store.addRecurringReservation({
        roomId: '1',
        userId: store.currentUser.id,
        startTime: '10:00',
        endTime: '11:00',
        title: '周一三五会议'
      }, '2024-01-01', rule)

      expect(result).toBeDefined()
      expect(result?.occurrences).toBeGreaterThan(0)
    })
  })

  describe('每月重复预定', () => {
    it('应该能创建每月重复预定', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const rule: RecurrenceRule = {
        type: 'monthly',
        interval: 1,
        maxOccurrences: 3
      }

      const result = store.addRecurringReservation({
        roomId: '1',
        userId: store.currentUser.id,
        startTime: '09:00',
        endTime: '10:00',
        title: '月度会议'
      }, '2024-01-15', rule)

      expect(result).toBeDefined()
      expect(result?.occurrences).toBe(3)
      expect(result?.series.occurrences[0]).toBe('2024-01-15')
      expect(result?.series.occurrences[1]).toBe('2024-02-15')
      expect(result?.series.occurrences[2]).toBe('2024-03-15')
    })

    it('间隔2个月的重复预定应该生成正确的日期', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const rule: RecurrenceRule = {
        type: 'monthly',
        interval: 2,
        maxOccurrences: 3
      }

      const result = store.addRecurringReservation({
        roomId: '1',
        userId: store.currentUser.id,
        startTime: '09:00',
        endTime: '10:00',
        title: '双月会议'
      }, '2024-01-15', rule)

      expect(result?.series.occurrences[0]).toBe('2024-01-15')
      expect(result?.series.occurrences[1]).toBe('2024-03-15')
      expect(result?.series.occurrences[2]).toBe('2024-05-15')
    })
  })

  describe('自定义重复预定', () => {
    it('应该能创建自定义间隔的重复预定', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const rule: RecurrenceRule = {
        type: 'custom',
        interval: 3,
        maxOccurrences: 3
      }

      const result = store.addRecurringReservation({
        roomId: '1',
        userId: store.currentUser.id,
        startTime: '09:00',
        endTime: '10:00',
        title: '自定义会议'
      }, '2024-01-01', rule)

      expect(result).toBeDefined()
      expect(result?.series.occurrences).toEqual(['2024-01-01', '2024-01-04', '2024-01-07'])
    })
  })

  describe('周期性预定状态管理', () => {
    it('普通用户创建的周期性预定应该处于待审批状态', () => {
      const store = useStore()

      const rule: RecurrenceRule = {
        type: 'daily',
        interval: 1,
        maxOccurrences: 3
      }

      const result = store.addRecurringReservation({
        roomId: '1',
        userId: store.currentUser.id,
        startTime: '09:00',
        endTime: '10:00',
        title: '周期性预定'
      }, '2024-01-01', rule)

      expect(result?.masterReservation.status).toBe('pending')
      const seriesReservations = store.getReservationsBySeries(result!.series.id)
      expect(seriesReservations.every(r => r.status === 'pending')).toBe(true)
    })

    it('管理员创建的周期性预定应该自动批准', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const rule: RecurrenceRule = {
        type: 'daily',
        interval: 1,
        maxOccurrences: 3
      }

      const result = store.addRecurringReservation({
        roomId: '1',
        userId: store.currentUser.id,
        startTime: '09:00',
        endTime: '10:00',
        title: '周期性预定'
      }, '2024-01-01', rule)

      expect(result?.masterReservation.status).toBe('approved')
      const seriesReservations = store.getReservationsBySeries(result!.series.id)
      expect(seriesReservations.every(r => r.status === 'approved')).toBe(true)
    })

    it('应该能获取周期性系列信息', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const rule: RecurrenceRule = {
        type: 'daily',
        interval: 1,
        maxOccurrences: 3
      }

      const result = store.addRecurringReservation({
        roomId: '1',
        userId: store.currentUser.id,
        startTime: '09:00',
        endTime: '10:00',
        title: '周期性预定'
      }, '2024-01-01', rule)

      const series = store.getRecurrenceSeries(result!.series.id)
      expect(series).toBeDefined()
      expect(series?.status).toBe('active')
      expect(series?.rule.type).toBe('daily')
    })

    it('应该能获取系列中的所有预定', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const rule: RecurrenceRule = {
        type: 'daily',
        interval: 1,
        maxOccurrences: 3
      }

      const result = store.addRecurringReservation({
        roomId: '1',
        userId: store.currentUser.id,
        startTime: '09:00',
        endTime: '10:00',
        title: '周期性预定'
      }, '2024-01-01', rule)

      const seriesReservations = store.getReservationsBySeries(result!.series.id)
      expect(seriesReservations).toHaveLength(3)
    })

    it('系列预定应该按日期排序', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const rule: RecurrenceRule = {
        type: 'daily',
        interval: 1,
        maxOccurrences: 3
      }

      const result = store.addRecurringReservation({
        roomId: '1',
        userId: store.currentUser.id,
        startTime: '09:00',
        endTime: '10:00',
        title: '周期性预定'
      }, '2024-01-01', rule)

      const seriesReservations = store.getReservationsBySeries(result!.series.id)
      expect(seriesReservations[0].date).toBe('2024-01-01')
      expect(seriesReservations[1].date).toBe('2024-01-02')
      expect(seriesReservations[2].date).toBe('2024-01-03')
    })
  })

  describe('取消周期性预定', () => {
    it('应该能取消单次周期性预定', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const rule: RecurrenceRule = {
        type: 'daily',
        interval: 1,
        maxOccurrences: 3
      }

      const result = store.addRecurringReservation({
        roomId: '1',
        userId: store.currentUser.id,
        startTime: '09:00',
        endTime: '10:00',
        title: '周期性预定'
      }, '2024-01-01', rule)

      const seriesReservations = store.getReservationsBySeries(result!.series.id)
      const secondReservation = seriesReservations[1]

      store.cancelSingleRecurrence(secondReservation.id)

      const updatedReservation = store.reservations.find(r => r.id === secondReservation.id)
      expect(updatedReservation?.status).toBe('cancelled')
    })

    it('取消单次预定应该记录到系列的取消列表', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const rule: RecurrenceRule = {
        type: 'daily',
        interval: 1,
        maxOccurrences: 3
      }

      const result = store.addRecurringReservation({
        roomId: '1',
        userId: store.currentUser.id,
        startTime: '09:00',
        endTime: '10:00',
        title: '周期性预定'
      }, '2024-01-01', rule)

      const seriesReservations = store.getReservationsBySeries(result!.series.id)
      const secondReservation = seriesReservations[1]

      store.cancelSingleRecurrence(secondReservation.id)

      const series = store.getRecurrenceSeries(result!.series.id)
      expect(series?.cancelledOccurrences).toContain('2024-01-02')
    })

    it('应该能取消整个系列', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const rule: RecurrenceRule = {
        type: 'daily',
        interval: 1,
        maxOccurrences: 3
      }

      const result = store.addRecurringReservation({
        roomId: '1',
        userId: store.currentUser.id,
        startTime: '09:00',
        endTime: '10:00',
        title: '周期性预定'
      }, '2024-01-01', rule)

      store.cancelAllRecurrences(result!.series.id)

      const series = store.getRecurrenceSeries(result!.series.id)
      expect(series?.status).toBe('cancelled')

      const seriesReservations = store.getReservationsBySeries(result!.series.id)
      expect(seriesReservations.every(r => r.status === 'cancelled')).toBe(true)
    })

    it('取消整个系列应该触发候补处理', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const rule: RecurrenceRule = {
        type: 'daily',
        interval: 1,
        maxOccurrences: 2
      }

      const result = store.addRecurringReservation({
        roomId: '1',
        userId: store.currentUser.id,
        startTime: '09:00',
        endTime: '10:00',
        title: '周期性预定'
      }, '2024-01-01', rule)

      store.setCurrentUser('2')
      store.addToWaitlist('1', '2024-01-01', '09:00', '10:00', '候补预定')

      store.setCurrentUser('1')
      store.cancelAllRecurrences(result!.series.id)

      const waitlistEntry = store.waitlist.find(w => w.title === '候补预定')
      expect(waitlistEntry?.status).toBe('assigned')
    })
  })

  describe('周期性预定审批流程', () => {
    it('批准主预定应该批准整个系列', () => {
      const store = useStore()

      const rule: RecurrenceRule = {
        type: 'daily',
        interval: 1,
        maxOccurrences: 3
      }

      const result = store.addRecurringReservation({
        roomId: '1',
        userId: store.currentUser.id,
        startTime: '09:00',
        endTime: '10:00',
        title: '周期性预定'
      }, '2024-01-01', rule)

      store.setCurrentUser('1')
      store.approveReservation(result!.masterReservation.id)

      const seriesReservations = store.getReservationsBySeries(result!.series.id)
      expect(seriesReservations.every(r => r.status === 'approved')).toBe(true)
    })

    it('拒绝主预定应该拒绝整个系列', () => {
      const store = useStore()

      const rule: RecurrenceRule = {
        type: 'daily',
        interval: 1,
        maxOccurrences: 3
      }

      const result = store.addRecurringReservation({
        roomId: '1',
        userId: store.currentUser.id,
        startTime: '09:00',
        endTime: '10:00',
        title: '周期性预定'
      }, '2024-01-01', rule)

      store.setCurrentUser('1')
      store.rejectReservation(result!.masterReservation.id, '时间不合适')

      const seriesReservations = store.getReservationsBySeries(result!.series.id)
      expect(seriesReservations.every(r => r.status === 'rejected')).toBe(true)
      expect(seriesReservations.every(r => r.rejectReason === '时间不合适')).toBe(true)

      const series = store.getRecurrenceSeries(result!.series.id)
      expect(series?.status).toBe('cancelled')
    })
  })

  describe('边界情况', () => {
    it('maxOccurrences为0时使用默认值50', () => {
      const store = useStore()
      store.setCurrentUser('1')

      const rule: RecurrenceRule = {
        type: 'daily',
        interval: 1,
        maxOccurrences: 0
      }

      const result = store.addRecurringReservation({
        roomId: '1',
        userId: store.currentUser.id,
        startTime: '09:00',
        endTime: '10:00',
        title: '周期性预定'
      }, '2024-01-01', rule)

      expect(result).toBeDefined()
      expect(result?.occurrences).toBe(50)
    })

    it('取消不存在的单次预定不应报错', () => {
      const store = useStore()
      store.cancelSingleRecurrence('999')
      expect(store.reservations).toHaveLength(0)
    })

    it('取消不存在的系列不应报错', () => {
      const store = useStore()
      store.cancelAllRecurrences('999')
      expect(store.recurrenceSeries).toHaveLength(0)
    })

    it('获取不存在的系列应该返回undefined', () => {
      const store = useStore()
      const series = store.getRecurrenceSeries('999')
      expect(series).toBeUndefined()
    })
  })
})
