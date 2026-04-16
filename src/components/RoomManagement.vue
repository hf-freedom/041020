<template>
  <div class="room-management">
    <div class="section-header">
      <h2>会议室管理</h2>
      <button class="btn btn-primary" @click="showAddModal = true">添加会议室</button>
    </div>

    <div class="room-list">
      <div v-for="room in rooms" :key="room.id" class="room-card">
        <div class="room-info">
          <h3>{{ room.name }}</h3>
          <p class="location">{{ room.location }}</p>
          <p class="time">
            开放时间：{{ room.openTimeStart }} - {{ room.openTimeEnd }}
          </p>
          <p :class="['status', room.disabled ? 'disabled' : 'enabled']">
            {{ room.disabled ? '已禁用' : '可用' }}
          </p>
        </div>
        <div class="room-actions">
          <button class="btn btn-small btn-primary" @click="editRoom(room)">编辑</button>
          <button 
            :class="['btn', 'btn-small', room.disabled ? 'btn-success' : 'btn-warning']"
            @click="toggleRoomStatus(room)"
          >
            {{ room.disabled ? '启用' : '禁用' }}
          </button>
          <button class="btn btn-small btn-danger" @click="confirmDelete(room)">删除</button>
        </div>
      </div>
    </div>

    <div v-if="showAddModal || showEditModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ showEditModal ? '编辑会议室' : '添加会议室' }}</h3>
          <button class="modal-close" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>会议室名称</label>
            <input v-model="formData.name" type="text" placeholder="请输入会议室名称" />
          </div>
          <div class="form-group">
            <label>位置</label>
            <input v-model="formData.location" type="text" placeholder="请输入位置" />
          </div>
          <div class="form-group">
            <label>开放时间</label>
            <div class="time-range">
              <input v-model="formData.openTimeStart" type="time" />
              <span>至</span>
              <input v-model="formData.openTimeEnd" type="time" />
            </div>
          </div>
          <div class="form-group">
            <label class="switch-label">
              <span>是否启用</span>
              <label class="switch">
                <input type="checkbox" v-model="enabled" />
                <span class="switch-slider"></span>
              </label>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="saveRoom">保存</button>
        </div>
      </div>
    </div>

    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="modal" style="min-width: 300px">
        <div class="modal-header">
          <h3>确认删除</h3>
          <button class="modal-close" @click="showDeleteConfirm = false">×</button>
        </div>
        <div class="modal-body">
          <p>确定要删除会议室"{{ roomToDelete?.name }}"吗？</p>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showDeleteConfirm = false">取消</button>
          <button class="btn btn-danger" @click="deleteRoom">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useStore } from '../stores'
import { storeToRefs } from 'pinia'
import type { MeetingRoom } from '../types'

const store = useStore()
const { rooms } = storeToRefs(store)

const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteConfirm = ref(false)
const editingRoom = ref<MeetingRoom | null>(null)
const roomToDelete = ref<MeetingRoom | null>(null)
const enabled = ref(true)

const formData = reactive({
  name: '',
  location: '',
  openTimeStart: '08:00',
  openTimeEnd: '18:00',
})

const editRoom = (room: MeetingRoom) => {
  editingRoom.value = room
  formData.name = room.name
  formData.location = room.location
  formData.openTimeStart = room.openTimeStart
  formData.openTimeEnd = room.openTimeEnd
  enabled.value = !room.disabled
  showEditModal.value = true
}

const closeModal = () => {
  showAddModal.value = false
  showEditModal.value = false
  editingRoom.value = null
  formData.name = ''
  formData.location = ''
  formData.openTimeStart = '08:00'
  formData.openTimeEnd = '18:00'
  enabled.value = true
}

const saveRoom = () => {
  if (!formData.name.trim() || !formData.location.trim()) {
    alert('请填写完整信息')
    return
  }

  if (showEditModal.value && editingRoom.value) {
    store.updateRoom(editingRoom.value.id, {
      name: formData.name,
      location: formData.location,
      openTimeStart: formData.openTimeStart,
      openTimeEnd: formData.openTimeEnd,
      disabled: !enabled.value,
    })
  } else {
    store.addRoom({
      name: formData.name,
      location: formData.location,
      openTimeStart: formData.openTimeStart,
      openTimeEnd: formData.openTimeEnd,
      disabled: !enabled.value,
    })
  }
  closeModal()
}

const toggleRoomStatus = (room: MeetingRoom) => {
  store.updateRoom(room.id, { disabled: !room.disabled })
}

const confirmDelete = (room: MeetingRoom) => {
  roomToDelete.value = room
  showDeleteConfirm.value = true
}

const deleteRoom = () => {
  if (roomToDelete.value) {
    store.deleteRoom(roomToDelete.value.id)
    showDeleteConfirm.value = false
    roomToDelete.value = null
  }
}
</script>

<style scoped>
.room-management {
  padding: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header h2 {
  font-size: 20px;
  color: #303133;
}

.room-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.room-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s, box-shadow 0.2s;
}

.room-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.room-info h3 {
  font-size: 16px;
  color: #303133;
  margin-bottom: 8px;
}

.room-info .location {
  color: #909399;
  font-size: 14px;
  margin-bottom: 4px;
}

.room-info .time {
  color: #606266;
  font-size: 14px;
  margin-bottom: 8px;
}

.room-info .status {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.room-info .status.enabled {
  background: #f0f9eb;
  color: #67c23a;
}

.room-info .status.disabled {
  background: #fef0f0;
  color: #f56c6c;
}

.room-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.time-range {
  display: flex;
  align-items: center;
  gap: 12px;
}

.time-range input {
  flex: 1;
}

.time-range span {
  color: #909399;
}

.switch-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
