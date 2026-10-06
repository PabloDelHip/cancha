<script setup lang="ts">
/** Ilustración ligera (portería sobre césped) para estados vacíos. Decorativa. */
</script>

<template>
  <svg viewBox="0 0 160 96" class="h-24 w-40" aria-hidden="true">
    <defs>
      <linearGradient id="empty-grass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#d6ecdd" />
        <stop offset="1" stop-color="#aed8bd" />
      </linearGradient>
    </defs>
    <ellipse cx="80" cy="84" rx="72" ry="10" fill="url(#empty-grass)" />
    <!-- Portería -->
    <path d="M36 82V30h88v52" fill="none" stroke="#143d2a" stroke-width="3" stroke-linejoin="round" />
    <g stroke="#7dbd96" stroke-width="1">
      <path d="M48 30v52M60 30v52M72 30v52M84 30v52M96 30v52M108 30v52" />
      <path d="M36 42h88M36 54h88M36 66h88" />
    </g>
    <!-- Balón -->
    <circle cx="116" cy="74" r="8" fill="#fff" stroke="#143d2a" stroke-width="2" />
    <path d="m116 70 3 2.2-1.2 3.6h-3.6L113 72.2Z" fill="#143d2a" />
    <circle cx="132" cy="22" r="3" fill="#a3e635" />
    <circle cx="24" cy="40" r="2" fill="#a3e635" />
  </svg>
</template>
