<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { initCommunity, trackVisit } from './services/community'
onLaunch(() => {
  initCommunity()
})
onShow(() => { void trackVisit() })
</script>
<style>
@import './styles.css';
</style>
