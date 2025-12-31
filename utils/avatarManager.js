import avatarConfig from '../config/avatarConfig.json'

class AvatarManager {
  constructor() {
    this.config = avatarConfig
    this.completionCallbacks = new Set()
  }

  // Get avatar configuration for a specific page
  getPageConfig(pageName) {
    // Return null since pageConfigs are removed
    return null
  }

  // Get avatar data by type
  getAvatar(avatarType) {
    return this.config.avatars[avatarType] || this.config.avatars.celebration
  }

  // Get random message for completion type from specific avatar
  getCompletionMessage(avatarType, completionType) {
    const avatar = this.getAvatar(avatarType)
    const messages = avatar.messages[completionType] || avatar.messages.habit_completion
    return messages[Math.floor(Math.random() * messages.length)]
  }

  // Get messages for page default display
  getPageMessages(pageName) {
    // Return empty array since page messages are removed
    return []
  }

  // Get avatar image for page
  getPageAvatar(pageName) {
    // Return null since page avatars are removed
    return null
  }

  // Get avatar name for page
  getPageAvatarName(pageName) {
    // Return default name since page avatars are removed
    return 'Guide'
  }

  // Get completion avatar (for task/habit completion)
  getCompletionAvatar() {
    const settings = this.config.settings
    const avatarType = settings.completionAvatar
    const avatar = this.getAvatar(avatarType)
    return {
      image: avatar.image,
      name: avatar.name
    }
  }

  // Get all available avatars
  getAllAvatars() {
    return Object.keys(this.config.avatars).map(key => ({
      type: key,
      ...this.config.avatars[key]
    }))
  }

  // Get settings
  getSettings() {
    return this.config.settings
  }

  // Register callback for completion events
  onCompletion(callback) {
    this.completionCallbacks.add(callback)
  }

  // Unregister callback
  offCompletion(callback) {
    this.completionCallbacks.delete(callback)
  }

  // Trigger completion event
  triggerCompletion(type, data = {}) {
    const settings = this.config.settings
    if (!settings.showOnCompletion) return

    const completionAvatar = this.getCompletionAvatar()
    const message = this.getCompletionMessage(settings.completionAvatar, type)

    const eventData = {
      type,
      message,
      avatarImage: completionAvatar.image,
      avatarName: completionAvatar.name,
      autoHideDelay: settings.autoHideDelay,
      typewriterSpeed: settings.typewriterSpeed,
      ...data
    }

    // Notify all registered callbacks
    this.completionCallbacks.forEach(callback => {
      try {
        callback(eventData)
      } catch (error) {
        console.error('Error in avatar completion callback:', error)
      }
    })

    return eventData
  }

  // Trigger habit completion
  triggerHabitCompletion(habitName, streakCount = 1) {
    return this.triggerCompletion('habit_completion', {
      habitName,
      streakCount
    })
  }

  // Trigger task completion
  triggerTaskCompletion(taskName, taskType = 'general') {
    return this.triggerCompletion('task_completion', {
      taskName,
      taskType
    })
  }

  // Trigger milestone
  triggerMilestone(milestoneType, value) {
    return this.triggerCompletion('milestone', {
      milestoneType,
      value
    })
  }

  // Get random avatar if randomization is enabled
  getRandomAvatar() {
    const settings = this.config.settings
    if (settings.randomizeAvatar) {
      const avatarTypes = Object.keys(this.config.avatars)
      const randomType = avatarTypes[Math.floor(Math.random() * avatarTypes.length)]
      return this.getAvatar(randomType)
    }
    return null
  }
}

// Create singleton instance
const avatarManager = new AvatarManager()

export default avatarManager
