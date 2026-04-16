<template>
  <header class="header">
    <div class="header-left">
      <h1 class="logo">会议室预定系统</h1>
    </div>
    <div class="header-right">
      <div class="user-selector">
        <span class="user-label">当前用户：</span>
        <div class="dropdown">
          <button class="dropdown-trigger" @click="showDropdown = !showDropdown">
            <span :class="['user-badge', currentUser.role]">
              {{ currentUser.role === 'admin' ? '管理员' : '用户' }}
            </span>
            {{ currentUser.name }}
            <span class="arrow">▼</span>
          </button>
          <div v-if="showDropdown" class="dropdown-menu">
            <div
              v-for="user in users"
              :key="user.id"
              :class="['dropdown-item', { active: user.id === currentUser.id }]"
              @click="selectUser(user.id)"
            >
              <span :class="['user-badge', user.role]">
                {{ user.role === 'admin' ? '管理员' : '用户' }}
              </span>
              {{ user.name }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useStore } from '../stores'
import { storeToRefs } from 'pinia'

const store = useStore()
const { currentUser, users } = storeToRefs(store)
const showDropdown = ref(false)

const selectUser = (userId: string) => {
  store.setCurrentUser(userId)
  showDropdown.value = false
}
</script>

<style scoped>
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.header-left {
  display: flex;
  align-items: center;
}

.logo {
  font-size: 20px;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-label {
  font-size: 14px;
  opacity: 0.9;
}

.dropdown {
  position: relative;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.dropdown-trigger:hover {
  background: rgba(255, 255, 255, 0.3);
}

.arrow {
  font-size: 10px;
  transition: transform 0.3s;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 180px;
  overflow: hidden;
  z-index: 100;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  color: #333;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #f5f7fa;
}

.dropdown-item.active {
  background: #ecf5ff;
  color: #409eff;
}

.user-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.user-badge.admin {
  background: #fef0f0;
  color: #f56c6c;
}

.user-badge.user {
  background: #f0f9eb;
  color: #67c23a;
}
</style>
