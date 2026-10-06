<script setup lang="ts">
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'
</script>

<template>
  <RouterView />
  <ConfirmDialog />
  <ToastContainer />
</template>
