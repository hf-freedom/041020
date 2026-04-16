<template>
  <div class="app">
    <AppHeader />
    <main class="main-content">
      <div class="tabs">
        <button 
          :class="['tab', { active: activeTab === 'calendar' }]"
          @click="activeTab = 'calendar'"
        >
          会议室预定
        </button>
        <button 
          v-if="isAdmin"
          :class="['tab', { active: activeTab === 'management' }]"
          @click="activeTab = 'management'"
        >
          会议室管理
        </button>
        <button 
          v-if="isAdmin"
          :class="['tab', { active: activeTab === 'approval' }]"
          @click="activeTab = 'approval'"
        >
          审批管理
          <span v-if="pendingCount > 0" class="badge">{{ pendingCount }}</span>
        </button>
        <button 
          :class="['tab', { active: activeTab === 'myReservations' }]"
          @click="activeTab = 'myReservations'"
        >
          我的预定
        </button>
      </div>
      
      <div class="tab-content">
        <CalendarView v-if="activeTab === 'calendar'" />
        <RoomManagement v-else-if="activeTab === 'management'" />
        <ApprovalManagement v-else-if="activeTab === 'approval'" />
        <MyReservations v-else-if="activeTab === 'myReservations'" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStore } from './stores'
import { storeToRefs } from 'pinia'
import AppHeader from './components/AppHeader.vue'
import CalendarView from './components/CalendarView.vue'
import RoomManagement from './components/RoomManagement.vue'
import MyReservations from './components/MyReservations.vue'
import ApprovalManagement from './components/ApprovalManagement.vue'

const store = useStore()
const { isAdmin, pendingReservations } = storeToRefs(store)
const activeTab = ref('calendar')

const pendingCount = computed(() => pendingReservations.value.length)

// 当切换到非管理员用户时，如果当前在管理员专属页面，切换到日历页面
watch(isAdmin, (newValue) => {
  if (!newValue && (activeTab.value === 'management' || activeTab.value === 'approval')) {
    activeTab.value = 'calendar'
  }
})
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  background: #f5f7fa;
}

.tabs {
  display: flex;
  gap: 0;
  background: white;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 20px;
}

.tab {
  padding: 16px 24px;
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

.tab:hover {
  color: #409eff;
}

.tab.active {
  color: #409eff;
  border-bottom-color: #409eff;
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

.tab-content {
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  padding: 0 20px;
}
</style>
