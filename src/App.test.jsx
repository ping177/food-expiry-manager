import { describe, expect, it } from 'vitest'
import { APP_DISPLAY_NAME } from './App'

describe('App display name', () => {
  it('shows the product as 库存保质期管理 in the UI', () => {
    expect(APP_DISPLAY_NAME).toBe('库存保质期管理')
  })
})
