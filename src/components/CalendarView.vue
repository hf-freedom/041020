<template>
  <div class="calendar-view">
    <div class="section-header">
      <h2>会议室预定</h2>
      <p class="subtitle" v-if="!isAdmin">普通用户预定需等待管理员审批</p>
      <p class="subtitle admin" v-else>管理员预定自动通过，无需审批</p>
    </div>

    <div class="controls">
      <div class="control-group">
        <label>选择会议室：</label>
        <select v-model="selectedRoomId">
          <option v-for="room in availableRooms" :key="room.id" :value="room.id">
            {{ room.name }} ({{ room.location }})
          </option>
        </select>
      </div>
      <div class="control-group">
        <label>选择日期：</label>
        <input type="date" v-model="selectedDate" :min="minDate" />
      </div>
    </div>

    <div v-if="currentRoom" class="calendar-container">
      <div class="room-info-bar">
        <span class="room-name">{{ currentRoom.name }}</span>
        <span class="room-time">开放时间：{{ currentRoom.openTimeStart }} - {{ currentRoom.openTimeEnd }}</span>
      </div>

      <div class="time-grid">
        <div class="time-labels">
          <div v-for="hour in hours" :key="hour" class="time-label">
            {{ hour.toString().padStart(2, '0') }}:00
          </div>
        </div>
        <div class="time-slots">
          <div
            v-for="slot in timeSlots"
            :key="slot.time"
            :class="['time-slot', { 
              disabled: slot.disabled, 
              reserved: slot.reservation?.status === 'approved',
              pending: slot.reservation?.status === 'pending',
              'my-reservation': slot.reservation?.userId === currentUser.id,
              'has-waitlist': slot.waitlistCount > 0
            }]"
            @click="handleSlotClick(slot)"
          >
            <span v-if="slot.reservation" class="reservation-info">
              <span class="reservation-title">{{ slot.reservation.title }}</span>
              <span class="reservation-user">{{ getUserName(slot.reservation.userId) }}</span>
              <span v-if="slot.reservation.status === 'pending'" class="reservation-status">待审批</span>
              <span v-if="slot.reservation.recurrenceId" class="recurrence-badge">周期</span>
            </span>
            <span v-else-if="!slot.disabled" class="slot-time">{{ slot.time }}</span>
            <span v-if="slot.waitlistCount > 0 && !slot.reservation" class="waitlist-indicator">
              候补: {{ slot.waitlistCount }}人
            </span>
          </div>
        </div>
      </div>

      <div class="legend">
        <div class="legend-item">
          <span class="legend-color available"></span>
          <span>可预定</span>
        </div>
        <div class="legend-item">
          <span class="legend-color reserved"></span>
          <span>已被预定</span>
        </div>
        <div class="legend-item">
          <span class="legend-color pending"></span>
          <span>审批中</span>
        </div>
        <div class="legend-item">
          <span class="legend-color my-reservation"></span>
          <span>我的预定</span>
        </div>
        <div class="legend-item">
          <span class="legend-color has-waitlist"></span>
          <span>有候补</span>
        </div>
        <div class="legend-item">
          <span class="legend-color disabled"></span>
          <span>非开放时间</span>
        </div>
      </div>
    </div>

    <!-- 预定弹窗 -->
    <div v-if="showReserveModal" class="modal-overlay" @click.self="closeReserveModal">
      <div class="modal modal-large">
        <div class="modal-header">
          <h3>预定会议室</h3>
          <button class="modal-close" @click="closeReserveModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>会议主题</label>
            <input v-model="reserveForm.title" type="text" placeholder="请输入会议主题" />
          </div>
          <div class="form-row">
            <div class="form-group half">
              <label>开始时间</label>
              <select v-model="reserveForm.startTime">
                <option v-for="time in availableStartTimes" :key="time" :value="time">
                  {{ time }}
                </option>
              </select>
            </div>
            <div class="form-group half">
              <label>结束时间</label>
              <select v-model="reserveForm.endTime">
                <option v-for="time in availableEndTimes" :key="time" :value="time">
                  {{ time }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="reserveForm.isRecurring" />
              <span>周期性预定</span>
            </label>
          </div>

          <div v-if="reserveForm.isRecurring" class="recurrence-settings">
            <div class="form-group">
              <label>重复类型</label>
              <select v-model="reserveForm.recurrenceType">
                <option value="daily">每日</option>
                <option value="weekly">每周</option>
                <option value="monthly">每月</option>
                <option value="custom">自定义间隔</option>
              </select>
            </div>

            <div class="form-group" v-if="reserveForm.recurrenceType === 'custom'">
              <label>间隔天数</label>
              <input type="number" v-model.number="reserveForm.interval" min="1" max="365" />
            </div>

            <div class="form-group" v-if="reserveForm.recurrenceType === 'weekly'">
              <label>选择星期</label>
              <div class="weekday-selector">
                <button 
                  v-for="(day, index) in weekdays" 
                  :key="index"
                  :class="['weekday-btn', { active: reserveForm.daysOfWeek.includes(index) }]"
                  @click="toggleWeekday(index)"
                >
                  {{ day }}
                </button>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group half">
                <label>结束日期</label>
                <input type="date" v-model="reserveForm.endDate" :min="selectedDate" />
              </div>
              <div class="form-group half">
                <label>或最大次数</label>
                <input type="number" v-model.number="reserveForm.maxOccurrences" min="1" max="100" placeholder="不限" />
              </div>
            </div>

            <div class="recurrence-preview" v-if="previewDates.length > 0">
              <p class="preview-title">预览日期 (共{{ previewDates.length }}次)：</p>
              <div class="preview-dates">
                <span v-for="date in previewDates.slice(0, 10)" :key="date" class="preview-date">
                  {{ formatDateDisplay(date) }}
                </span>
                <span v-if="previewDates.length > 10" class="preview-more">
                  ...还有{{ previewDates.length - 10 }}次
                </span>
              </div>
            </div>
          </div>

          <p class="form-tip" v-if="!isAdmin">
            <span class="tip-icon">ℹ️</span>
            提交后需等待管理员审批
          </p>
          <p class="form-tip admin" v-else>
            <span class="tip-icon">✓</span>
            管理员预定自动通过
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="closeReserveModal">取消</button>
          <button class="btn btn-primary" @click="confirmReserve">确认预定</button>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="showDetailModal" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal" style="min-width: 400px">
        <div class="modal-header">
          <h3>预定详情</h3>
          <button class="modal-close" @click="showDetailModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="detail-item">
            <span class="detail-label">会议主题：</span>
            <span>{{ selectedReservation?.title }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">预定人：</span>
            <span>{{ getUserName(selectedReservation?.userId || '') }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">时间：</span>
            <span>{{ selectedReservation?.startTime }} - {{ selectedReservation?.endTime }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">状态：</span>
            <span :class="['status-text', selectedReservation?.status]">
              {{ getStatusText(selectedReservation?.status) }}
            </span>
          </div>
          <div class="detail-item" v-if="selectedReservation?.recurrenceId">
            <span class="detail-label">周期预定：</span>
            <span class="recurrence-info">是 ({{ getRecurrenceInfo(selectedReservation) }})</span>
          </div>
          
          <div v-if="canJoinWaitlist" class="waitlist-section">
            <p class="waitlist-tip">该时段已被预定，您可以加入候补队列</p>
            <button class="btn btn-warning" @click="joinWaitlist">
              加入候补
            </button>
          </div>
          
          <div v-if="slotWaitlist.length > 0" class="waitlist-info">
            <p class="waitlist-title">当前候补队列 ({{ slotWaitlist.length }}人)：</p>
            <div class="waitlist-queue">
              <div v-for="entry in slotWaitlist" :key="entry.id" class="waitlist-entry">
                <span class="position">{{ entry.position }}</span>
                <span class="name">{{ getUserName(entry.userId) }}</span>
                <span v-if="entry.userId === currentUser.id" class="you-badge">你</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showDetailModal = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- 候补弹窗 -->
    <div v-if="showWaitlistModal" class="modal-overlay" @click.self="closeWaitlistModal">
      <div class="modal" style="min-width: 400px">
        <div class="modal-header">
          <h3>加入候补</h3>
          <button class="modal-close" @click="closeWaitlistModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>会议主题</label>
            <input v-model="waitlistForm.title" type="text" placeholder="请输入会议主题" />
          </div>
          <div class="detail-item">
            <span class="detail-label">会议室：</span>
            <span>{{ currentRoom?.name }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">日期：</span>
            <span>{{ selectedDate }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">时间：</span>
            <span>{{ waitlistForm.startTime }} - {{ waitlistForm.endTime }}</span>
          </div>
          <div class="detail-item" v-if="currentWaitlistPosition > 0">
            <span class="detail-label">当前排队：</span>
            <span>{{ currentWaitlistPosition }}人</span>
          </div>
          <p class="form-tip">
            <span class="tip-icon">ℹ️</span>
            当有人取消预定后，系统将按顺序自动分配
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="closeWaitlistModal">取消</button>
          <button class="btn btn-warning" @click="confirmWaitlist">确认候补</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStore } from '../stores'
import { storeToRefs } from 'pinia'
import type { Reservation, ReservationStatus, RecurrenceRule } from '../types'

const store = useStore()
const { availableRooms, currentUser, isAdmin, users } = storeToRefs(store)

const selectedRoomId = ref('')
const selectedDate = ref(formatDate(new Date()))
const showReserveModal = ref(false)
const showDetailModal = ref(false)
const showWaitlistModal = ref(false)
const selectedReservation = ref<Reservation | null>(null)
const clickStartTime = ref('')

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const reserveForm = ref({
  title: '',
  startTime: '',
  endTime: '',
  isRecurring: false,
  recurrenceType: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'custom',
  interval: 1,
  daysOfWeek: [] as number[],
  endDate: '',
  maxOccurrences: 10
})

const waitlistForm = ref({
  title: '',
  startTime: '',
  endTime: ''
})

const minDate = formatDate(new Date())

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr)
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${dateStr} ${weekdays[date.getDay()]}`
}

watch(availableRooms, (rooms) => {
  if (rooms.length > 0 && !selectedRoomId.value) {
    selectedRoomId.value = rooms[0].id
  }
}, { immediate: true })

const currentRoom = computed(() => {
  return availableRooms.value.find(r => r.id === selectedRoomId.value)
})

const hours = computed(() => {
  if (!currentRoom.value) return []
  const start = parseInt(currentRoom.value.openTimeStart.split(':')[0])
  const end = parseInt(currentRoom.value.openTimeEnd.split(':')[0])
  return Array.from({ length: end - start }, (_, i) => start + i)
})

const timeSlots = computed(() => {
  if (!currentRoom.value) return []
  
  const slots: { time: string; disabled: boolean; reservation: Reservation | null; waitlistCount: number }[] = []
  const [startHour, startMin] = currentRoom.value.openTimeStart.split(':').map(Number)
  const [endHour, endMin] = currentRoom.value.openTimeEnd.split(':').map(Number)
  
  const reservations = store.getActiveReservationsByRoomAndDate(selectedRoomId.value, selectedDate.value)
  
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === endHour - 1 && m >= endMin) break
      if (h === startHour && m < startMin) continue
      
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
      
      const reservation = reservations.find(r => {
        return time >= r.startTime && time < r.endTime
      })
      
      const waitlistCount = store.getWaitlistForSlot(selectedRoomId.value, selectedDate.value, time, getEndTime(time)).length
      
      slots.push({
        time,
        disabled: false,
        reservation: reservation || null,
        waitlistCount: reservation ? 0 : waitlistCount
      })
    }
  }
  
  return slots
})

function getEndTime(startTime: string): string {
  const [h, m] = startTime.split(':').map(Number)
  const newM = m + 30
  const newH = newM >= 60 ? h + 1 : h
  return `${newH.toString().padStart(2, '0')}:${(newM % 60).toString().padStart(2, '0')}`
}

const availableStartTimes = computed(() => {
  if (!currentRoom.value) return []
  const times: string[] = []
  const [startHour] = currentRoom.value.openTimeStart.split(':').map(Number)
  const [endHour, endMin] = currentRoom.value.openTimeEnd.split(':').map(Number)
  
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === endHour - 1 && m >= endMin - 30) break
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
      times.push(time)
    }
  }
  return times
})

const availableEndTimes = computed(() => {
  if (!currentRoom.value || !reserveForm.value.startTime) return []
  const times: string[] = []
  const [startH, startM] = reserveForm.value.startTime.split(':').map(Number)
  const [endHour, endMin] = currentRoom.value.openTimeEnd.split(':').map(Number)
  
  for (let h = startH; h <= endHour; h++) {
    const startMForHour = h === startH ? startM + 30 : 0
    for (let m = startMForHour; m < 60; m += 30) {
      if (h === endHour && m > endMin) break
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
      times.push(time)
    }
  }
  return times
})

const previewDates = computed(() => {
  if (!reserveForm.value.isRecurring) return []
  
  const rule: RecurrenceRule = {
    type: reserveForm.value.recurrenceType,
    interval: reserveForm.value.interval,
    daysOfWeek: reserveForm.value.daysOfWeek.length > 0 ? reserveForm.value.daysOfWeek : undefined,
    endDate: reserveForm.value.endDate || undefined,
    maxOccurrences: reserveForm.value.maxOccurrences || 50
  }
  
  return generatePreviewDates(selectedDate.value, rule)
})

function generatePreviewDates(startDate: string, rule: RecurrenceRule): string[] {
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

const slotWaitlist = computed(() => {
  if (!selectedReservation.value) return []
  return store.getWaitlistForSlot(
    selectedReservation.value.roomId,
    selectedReservation.value.date,
    selectedReservation.value.startTime,
    selectedReservation.value.endTime
  )
})

const canJoinWaitlist = computed(() => {
  if (!selectedReservation.value) return false
  if (selectedReservation.value.userId === currentUser.value.id) return false
  return selectedReservation.value.status === 'approved' || selectedReservation.value.status === 'pending'
})

const currentWaitlistPosition = computed(() => {
  const entries = store.getWaitlistForSlot(
    selectedRoomId.value,
    selectedDate.value,
    waitlistForm.value.startTime,
    waitlistForm.value.endTime
  )
  return entries.length
})

const getUserName = (userId: string) => {
  return users.value.find(u => u.id === userId)?.name || '未知用户'
}

const getStatusText = (status?: ReservationStatus) => {
  const statusMap: Record<ReservationStatus, string> = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已驳回',
    cancelled: '已取消',
    waitlist: '候补中'
  }
  return status ? statusMap[status] : ''
}

const getRecurrenceInfo = (reservation: Reservation | null) => {
  if (!reservation?.recurrenceRule) return ''
  const rule = reservation.recurrenceRule
  const typeMap: Record<string, string> = {
    daily: '每日',
    weekly: '每周',
    monthly: '每月',
    custom: '自定义'
  }
  let info = typeMap[rule.type] || rule.type
  if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
    const days = rule.daysOfWeek.map(d => weekdays[d]).join('、')
    info += ` (${days})`
  }
  return info
}

const toggleWeekday = (day: number) => {
  const index = reserveForm.value.daysOfWeek.indexOf(day)
  if (index > -1) {
    reserveForm.value.daysOfWeek.splice(index, 1)
  } else {
    reserveForm.value.daysOfWeek.push(day)
  }
}

const handleSlotClick = (slot: { time: string; disabled: boolean; reservation: Reservation | null; waitlistCount: number }) => {
  if (slot.disabled) return
  
  if (slot.reservation) {
    selectedReservation.value = slot.reservation
    showDetailModal.value = true
  } else {
    clickStartTime.value = slot.time
    reserveForm.value = {
      title: '',
      startTime: slot.time,
      endTime: '',
      isRecurring: false,
      recurrenceType: 'weekly',
      interval: 1,
      daysOfWeek: [],
      endDate: '',
      maxOccurrences: 10
    }
    showReserveModal.value = true
  }
}

const closeReserveModal = () => {
  showReserveModal.value = false
  reserveForm.value = { 
    title: '', 
    startTime: '', 
    endTime: '', 
    isRecurring: false,
    recurrenceType: 'weekly',
    interval: 1,
    daysOfWeek: [],
    endDate: '',
    maxOccurrences: 10
  }
}

const confirmReserve = () => {
  if (!reserveForm.value.title.trim()) {
    alert('请输入会议主题')
    return
  }
  if (!reserveForm.value.startTime || !reserveForm.value.endTime) {
    alert('请选择时间')
    return
  }
  if (reserveForm.value.endTime <= reserveForm.value.startTime) {
    alert('结束时间必须晚于开始时间')
    return
  }
  
  if (store.checkTimeConflict(selectedRoomId.value, selectedDate.value, reserveForm.value.startTime, reserveForm.value.endTime)) {
    const confirmed = confirm('该时间段已被预定，是否加入候补队列？')
    if (confirmed) {
      waitlistForm.value = {
        title: reserveForm.value.title,
        startTime: reserveForm.value.startTime,
        endTime: reserveForm.value.endTime
      }
      showReserveModal.value = false
      showWaitlistModal.value = true
    }
    return
  }
  
  if (reserveForm.value.isRecurring) {
    const rule: RecurrenceRule = {
      type: reserveForm.value.recurrenceType,
      interval: reserveForm.value.interval,
      daysOfWeek: reserveForm.value.daysOfWeek.length > 0 ? reserveForm.value.daysOfWeek : undefined,
      endDate: reserveForm.value.endDate || undefined,
      maxOccurrences: reserveForm.value.maxOccurrences || 50
    }
    
    const result = store.addRecurringReservation(
      {
        roomId: selectedRoomId.value,
        userId: currentUser.value.id,
        startTime: reserveForm.value.startTime,
        endTime: reserveForm.value.endTime,
        title: reserveForm.value.title,
      },
      selectedDate.value,
      rule
    )
    
    closeReserveModal()
    
    if (result) {
      if (isAdmin.value) {
        alert(`周期预定成功！共生成${result.occurrences}次预定，已自动通过。`)
      } else {
        alert(`周期预定申请已提交，共${result.occurrences}次预定，请等待管理员审批。`)
      }
    }
  } else {
    store.addReservation({
      roomId: selectedRoomId.value,
      userId: currentUser.value.id,
      date: selectedDate.value,
      startTime: reserveForm.value.startTime,
      endTime: reserveForm.value.endTime,
      title: reserveForm.value.title,
    })
    
    closeReserveModal()
    
    if (isAdmin.value) {
      alert('预定成功！管理员预定已自动通过。')
    } else {
      alert('预定申请已提交，请等待管理员审批。')
    }
  }
}

const joinWaitlist = () => {
  if (!selectedReservation.value) return
  
  waitlistForm.value = {
    title: '',
    startTime: selectedReservation.value.startTime,
    endTime: selectedReservation.value.endTime
  }
  
  showDetailModal.value = false
  showWaitlistModal.value = true
}

const closeWaitlistModal = () => {
  showWaitlistModal.value = false
  waitlistForm.value = { title: '', startTime: '', endTime: '' }
}

const confirmWaitlist = () => {
  if (!waitlistForm.value.title.trim()) {
    alert('请输入会议主题')
    return
  }
  
  store.addToWaitlist(
    selectedRoomId.value,
    selectedDate.value,
    waitlistForm.value.startTime,
    waitlistForm.value.endTime,
    waitlistForm.value.title
  )
  
  closeWaitlistModal()
  alert('已加入候补队列，当有人取消预定后将自动分配给您。')
}
</script>

<style scoped>
.calendar-view {
  padding: 20px;
}

.section-header {
  margin-bottom: 16px;
}

.section-header h2 {
  font-size: 20px;
  color: #303133;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 13px;
  color: #e6a23c;
}

.subtitle.admin {
  color: #67c23a;
}

.controls {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-group label {
  font-weight: 500;
  color: #606266;
}

.control-group select,
.control-group input {
  min-width: 200px;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
}

.control-group select:focus,
.control-group input:focus {
  outline: none;
  border-color: #409eff;
}

.calendar-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.room-info-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f5f7fa;
  border-bottom: 1px solid #eee;
}

.room-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.room-time {
  font-size: 14px;
  color: #909399;
}

.time-grid {
  display: flex;
  min-height: 400px;
}

.time-labels {
  width: 80px;
  background: #fafafa;
  border-right: 1px solid #eee;
}

.time-label {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #606266;
  border-bottom: 1px solid #f0f0f0;
}

.time-slots {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
}

.time-slot {
  height: 60px;
  border-bottom: 1px solid #f0f0f0;
  border-right: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  flex-direction: column;
}

.time-slot:hover:not(.disabled):not(.reserved):not(.pending) {
  background: #ecf5ff;
}

.time-slot.disabled {
  background: #f5f7fa;
  cursor: not-allowed;
}

.time-slot.reserved {
  background: #fef0f0;
  cursor: pointer;
}

.time-slot.pending {
  background: #fdf6ec;
  cursor: pointer;
}

.time-slot.my-reservation {
  border: 2px solid #409eff;
}

.time-slot.has-waitlist {
  background: #fff7e6;
}

.slot-time {
  font-size: 13px;
  color: #606266;
}

.reservation-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px;
}

.reservation-title {
  font-size: 12px;
  font-weight: 500;
  color: #303133;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.reservation-user {
  font-size: 11px;
  color: #606266;
}

.reservation-status {
  font-size: 10px;
  color: #e6a23c;
  background: #fff;
  padding: 2px 6px;
  border-radius: 4px;
}

.recurrence-badge {
  font-size: 10px;
  color: #409eff;
  background: #ecf5ff;
  padding: 2px 6px;
  border-radius: 4px;
}

.waitlist-indicator {
  font-size: 11px;
  color: #e6a23c;
  background: #fdf6ec;
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 4px;
}

.legend {
  display: flex;
  gap: 24px;
  padding: 16px 20px;
  background: #fafafa;
  border-top: 1px solid #eee;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #606266;
}

.legend-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.legend-color.available {
  background: white;
}

.legend-color.reserved {
  background: #fef0f0;
}

.legend-color.pending {
  background: #fdf6ec;
}

.legend-color.my-reservation {
  background: white;
  border: 2px solid #409eff;
}

.legend-color.has-waitlist {
  background: #fff7e6;
}

.legend-color.disabled {
  background: #f5f7fa;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 8px;
  min-width: 400px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
}

.modal-large {
  min-width: 500px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  font-size: 16px;
  color: #303133;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #909399;
  cursor: pointer;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #606266;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #409eff;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-group.half {
  flex: 1;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
}

.recurrence-settings {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.weekday-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.weekday-btn {
  width: 36px;
  height: 36px;
  border: 1px solid #dcdfe6;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.weekday-btn:hover {
  border-color: #409eff;
  color: #409eff;
}

.weekday-btn.active {
  background: #409eff;
  color: white;
  border-color: #409eff;
}

.recurrence-preview {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
}

.preview-title {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
}

.preview-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preview-date {
  font-size: 12px;
  background: #ecf5ff;
  color: #409eff;
  padding: 4px 8px;
  border-radius: 4px;
}

.preview-more {
  font-size: 12px;
  color: #909399;
  padding: 4px 8px;
}

.form-tip {
  margin-top: 12px;
  padding: 10px 12px;
  background: #fdf6ec;
  border-radius: 4px;
  font-size: 13px;
  color: #e6a23c;
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-tip.admin {
  background: #f0f9eb;
  color: #67c23a;
}

.tip-icon {
  font-size: 14px;
}

.detail-item {
  display: flex;
  margin-bottom: 12px;
  font-size: 14px;
}

.detail-label {
  color: #909399;
  width: 80px;
  flex-shrink: 0;
}

.status-text {
  font-weight: 500;
}

.status-text.pending {
  color: #e6a23c;
}

.status-text.approved {
  color: #67c23a;
}

.status-text.rejected {
  color: #f56c6c;
}

.status-text.cancelled {
  color: #909399;
}

.status-text.waitlist {
  color: #e6a23c;
}

.recurrence-info {
  color: #409eff;
}

.waitlist-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.waitlist-tip {
  font-size: 13px;
  color: #e6a23c;
  margin-bottom: 12px;
}

.waitlist-info {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.waitlist-title {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
}

.waitlist-queue {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.waitlist-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.waitlist-entry .position {
  width: 24px;
  height: 24px;
  background: #f5f7fa;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #606266;
}

.waitlist-entry .name {
  color: #303133;
}

.you-badge {
  font-size: 11px;
  background: #409eff;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
}

/* 按钮样式 */
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

.btn-primary {
  background: #409eff;
  color: white;
  border-color: #409eff;
}

.btn-primary:hover {
  background: #66b1ff;
  border-color: #66b1ff;
  color: white;
}

.btn-warning {
  background: #e6a23c;
  color: white;
  border-color: #e6a23c;
}

.btn-warning:hover {
  background: #ebb563;
  border-color: #ebb563;
  color: white;
}
</style>
