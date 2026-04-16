<template>
  <div class="my-reservations">
    <div class="section-header">
      <h2>我的预定</h2>
    </div>

    <div class="tabs-container">
      <div class="main-tabs">
        <button 
          :class="['main-tab', { active: activeMainTab === 'reservations' }]"
          @click="activeMainTab = 'reservations'"
        >
          预定记录
        </button>
        <button 
          :class="['main-tab', { active: activeMainTab === 'waitlist' }]"
          @click="activeMainTab = 'waitlist'"
        >
          候补队列
          <span v-if="myWaitlist.length > 0" class="badge">{{ myWaitlist.length }}</span>
        </button>
      </div>
    </div>

    <div v-if="activeMainTab === 'reservations'">
      <div class="filter-tabs">
        <button 
          :class="['filter-tab', { active: currentFilter === 'all' }]"
          @click="currentFilter = 'all'"
        >
          全部
        </button>
        <button 
          :class="['filter-tab', { active: currentFilter === 'pending' }]"
          @click="currentFilter = 'pending'"
        >
          待审批
        </button>
        <button 
          :class="['filter-tab', { active: currentFilter === 'approved' }]"
          @click="currentFilter = 'approved'"
        >
          已通过
        </button>
        <button 
          :class="['filter-tab', { active: currentFilter === 'rejected' }]"
          @click="currentFilter = 'rejected'"
        >
          已驳回
        </button>
        <button 
          :class="['filter-tab', { active: currentFilter === 'cancelled' }]"
          @click="currentFilter = 'cancelled'"
        >
          已取消
        </button>
      </div>

      <div v-if="filteredReservations.length === 0" class="empty-state">
        <p>暂无预定记录</p>
      </div>

      <div v-else class="reservation-list">
        <div 
          v-for="reservation in filteredReservations" 
          :key="reservation.id" 
          :class="['reservation-card', reservation.status]"
        >
          <div class="reservation-info">
            <div class="title-row">
              <h3>{{ reservation.title }}</h3>
              <span v-if="reservation.recurrenceId" class="recurrence-badge">周期预定</span>
            </div>
            <p class="room-name">{{ getRoomName(reservation.roomId) }}</p>
            <p class="time-info">
              <span class="date">{{ reservation.date }}</span>
              <span class="time">{{ reservation.startTime }} - {{ reservation.endTime }}</span>
            </p>
            <div class="status-row">
              <span :class="['status-badge', reservation.status]">
                {{ getStatusText(reservation.status) }}
              </span>
              <span v-if="isPast(reservation)" class="past-badge">已结束</span>
            </div>
            <p v-if="reservation.rejectReason" class="reject-reason">
              驳回原因：{{ reservation.rejectReason }}
            </p>
            <p v-if="reservation.recurrenceId && reservation.isRecurrenceMaster" class="recurrence-info">
              周期系列：共 {{ getSeriesOccurrenceCount(reservation.recurrenceId) }} 次预定
            </p>
          </div>
          <div class="reservation-actions">
            <template v-if="reservation.recurrenceId && reservation.isRecurrenceMaster">
              <button 
                v-if="reservation.status === 'pending' || reservation.status === 'approved'"
                class="btn btn-small btn-danger" 
                @click="handleCancelAll(reservation)"
              >
                取消全部
              </button>
            </template>
            <template v-else-if="reservation.recurrenceId && !reservation.isRecurrenceMaster">
              <button 
                v-if="reservation.status === 'pending' || reservation.status === 'approved'"
                class="btn btn-small btn-danger" 
                @click="handleCancelSingle(reservation)"
              >
                取消本次
              </button>
            </template>
            <template v-else>
              <button 
                v-if="reservation.status === 'pending' || reservation.status === 'approved'"
                class="btn btn-small btn-danger" 
                @click="handleCancel(reservation)"
              >
                取消预定
              </button>
            </template>
            <span v-if="reservation.status === 'cancelled'" class="action-text">
              已取消
            </span>
            <span v-else-if="reservation.status === 'rejected'" class="action-text">
              已驳回
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeMainTab === 'waitlist'">
      <div v-if="myWaitlist.length === 0" class="empty-state">
        <p>暂无候补记录</p>
      </div>

      <div v-else class="waitlist-list">
        <div 
          v-for="entry in myWaitlist" 
          :key="entry.id" 
          :class="['waitlist-card', entry.status]"
        >
          <div class="waitlist-info">
            <div class="title-row">
              <h3>{{ entry.title }}</h3>
              <span class="position-badge">第 {{ entry.position }} 位</span>
            </div>
            <p class="room-name">{{ getRoomName(entry.roomId) }}</p>
            <p class="time-info">
              <span class="date">{{ entry.date }}</span>
              <span class="time">{{ entry.startTime }} - {{ entry.endTime }}</span>
            </p>
            <div class="status-row">
              <span :class="['status-badge', entry.status]">
                {{ getWaitlistStatusText(entry.status) }}
              </span>
            </div>
            <p v-if="entry.status === 'assigned'" class="assigned-info">
              已自动分配预定，请查看预定记录
            </p>
          </div>
          <div class="waitlist-actions">
            <button 
              v-if="entry.status === 'waiting'"
              class="btn btn-small btn-danger" 
              @click="handleCancelWaitlist(entry)"
            >
              取消候补
            </button>
            <span v-else-if="entry.status === 'assigned'" class="action-text success">
              已分配
            </span>
            <span v-else class="action-text">
              已取消
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStore } from '../stores'
import { storeToRefs } from 'pinia'
import type { Reservation, ReservationStatus, WaitlistEntry } from '../types'

const store = useStore()
const { currentUser, rooms } = storeToRefs(store)

const currentFilter = ref<ReservationStatus | 'all'>('all')
const activeMainTab = ref<'reservations' | 'waitlist'>('reservations')

const myReservations = computed(() => {
  return store.getReservationsByUser(currentUser.value.id)
})

const myWaitlist = computed(() => {
  return store.getWaitlistByUser(currentUser.value.id).filter(w => w.status !== 'cancelled')
})

const filteredReservations = computed(() => {
  if (currentFilter.value === 'all') {
    return myReservations.value
  }
  return myReservations.value.filter(r => r.status === currentFilter.value)
})

const getRoomName = (roomId: string) => {
  return rooms.value.find(r => r.id === roomId)?.name || '未知会议室'
}

const getStatusText = (status: ReservationStatus) => {
  const statusMap: Record<ReservationStatus, string> = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已驳回',
    cancelled: '已取消',
    waitlist: '候补中'
  }
  return statusMap[status]
}

const getWaitlistStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    waiting: '排队中',
    assigned: '已分配',
    cancelled: '已取消'
  }
  return statusMap[status] || status
}

const getSeriesOccurrenceCount = (seriesId: string) => {
  const series = store.getRecurrenceSeries(seriesId)
  if (!series) return 0
  return series.occurrences.length - series.cancelledOccurrences.length
}

const isPast = (reservation: Reservation) => {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const nowTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`
  
  if (reservation.date < todayStr) return true
  if (reservation.date > todayStr) return false
  return reservation.endTime <= nowTime
}

const handleCancel = (reservation: Reservation) => {
  const statusText = reservation.status === 'pending' ? '待审批' : '已通过'
  if (confirm(`确定要取消这个${statusText}的预定吗？\n\n会议：${reservation.title}\n时间：${reservation.date} ${reservation.startTime}-${reservation.endTime}`)) {
    store.cancelReservation(reservation.id)
    alert('预定已取消')
  }
}

const handleCancelSingle = (reservation: Reservation) => {
  if (confirm(`确定要取消这次周期预定吗？\n\n会议：${reservation.title}\n时间：${reservation.date} ${reservation.startTime}-${reservation.endTime}\n\n注意：这只会取消本次预定，其他周期预定不受影响。`)) {
    store.cancelSingleRecurrence(reservation.id)
    alert('本次预定已取消')
  }
}

const handleCancelAll = (reservation: Reservation) => {
  if (confirm(`确定要取消整个周期预定系列吗？\n\n会议：${reservation.title}\n\n注意：这将取消该系列的所有预定。`)) {
    store.cancelAllRecurrences(reservation.recurrenceId!)
    alert('周期预定已全部取消')
  }
}

const handleCancelWaitlist = (entry: WaitlistEntry) => {
  if (confirm(`确定要取消候补吗？\n\n会议：${entry.title}\n时间：${entry.date} ${entry.startTime}-${entry.endTime}`)) {
    store.cancelWaitlistEntry(entry.id)
    alert('候补已取消')
  }
}
</script>

<style scoped>
.my-reservations {
  padding: 20px;
}

.section-header {
  margin-bottom: 20px;
}

.section-header h2 {
  font-size: 20px;
  color: #303133;
}

.tabs-container {
  margin-bottom: 20px;
}

.main-tabs {
  display: flex;
  gap: 0;
  background: white;
  border-radius: 8px 8px 0 0;
  border: 1px solid #e4e7ed;
  border-bottom: none;
}

.main-tab {
  padding: 12px 24px;
  border: none;
  background: none;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.main-tab:first-child {
  border-radius: 8px 0 0 0;
}

.main-tab:hover {
  color: #409eff;
}

.main-tab.active {
  color: #409eff;
  border-bottom-color: #409eff;
  background: #f5f7fa;
}

.badge {
  background: #f56c6c;
  color: white;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-tab {
  padding: 8px 16px;
  border: 1px solid #dcdfe6;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.filter-tab:hover {
  border-color: #409eff;
  color: #409eff;
}

.filter-tab.active {
  background: #409eff;
  color: white;
  border-color: #409eff;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #909399;
  background: white;
  border-radius: 8px;
}

.reservation-list,
.waitlist-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.reservation-card,
.waitlist-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border-left: 4px solid #409eff;
}

.reservation-card.pending,
.waitlist-card.waiting {
  border-left-color: #e6a23c;
}

.reservation-card.approved {
  border-left-color: #67c23a;
}

.reservation-card.rejected {
  border-left-color: #f56c6c;
}

.reservation-card.cancelled,
.waitlist-card.cancelled {
  border-left-color: #909399;
  opacity: 0.8;
}

.waitlist-card.assigned {
  border-left-color: #67c23a;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.reservation-info h3,
.waitlist-info h3 {
  font-size: 16px;
  color: #303133;
  margin: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recurrence-badge {
  font-size: 11px;
  background: #ecf5ff;
  color: #409eff;
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}

.position-badge {
  font-size: 11px;
  background: #fdf6ec;
  color: #e6a23c;
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}

.reservation-info .room-name,
.waitlist-info .room-name {
  color: #409eff;
  font-size: 14px;
  margin-bottom: 8px;
}

.reservation-info .time-info,
.waitlist-info .time-info {
  display: flex;
  gap: 12px;
  font-size: 14px;
  color: #606266;
  margin-bottom: 12px;
}

.reservation-info .date,
.waitlist-info .date {
  background: #f5f7fa;
  padding: 2px 8px;
  border-radius: 4px;
}

.status-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.pending,
.status-badge.waiting {
  background: #fdf6ec;
  color: #e6a23c;
}

.status-badge.approved,
.status-badge.assigned {
  background: #f0f9eb;
  color: #67c23a;
}

.status-badge.rejected {
  background: #fef0f0;
  color: #f56c6c;
}

.status-badge.cancelled {
  background: #f4f4f5;
  color: #909399;
}

.past-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: #f4f4f5;
  color: #909399;
}

.reject-reason {
  font-size: 13px;
  color: #f56c6c;
  margin-top: 8px;
  padding: 8px;
  background: #fef0f0;
  border-radius: 4px;
}

.recurrence-info {
  font-size: 12px;
  color: #409eff;
  margin-top: 8px;
}

.assigned-info {
  font-size: 12px;
  color: #67c23a;
  margin-top: 8px;
}

.reservation-actions,
.waitlist-actions {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.action-text {
  color: #909399;
  font-size: 14px;
}

.action-text.success {
  color: #67c23a;
}

.btn {
  padding: 8px 16px;
  border: 1px solid #dcdfe6;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn:hover {
  border-color: #c6e2ff;
  color: #409eff;
}

.btn-danger {
  background: #f56c6c;
  color: white;
  border-color: #f56c6c;
}

.btn-danger:hover {
  background: #f78989;
  border-color: #f78989;
}

.btn-small {
  padding: 6px 12px;
  font-size: 13px;
}
</style>
