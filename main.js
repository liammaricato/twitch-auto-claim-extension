let timeCount = 0
let interval = null
let featureEnabled = localStorage.getItem('twitchAutoClaimEnabled') !== 'false' // Default to true unless explicitly disabled
let totalPoints = 0
let totalWatchPoints = 0
let totalAutoClaimPoints = 0
let catchNextBonus = false

const startInterval = () => {
    if (!featureEnabled) return

    interval = setInterval(() => {
        bonusEl = document.querySelector('.claimable-bonus__icon')
        if (bonusEl) {
            bonusEl.click()
            console.log('[TwitchAutoClaim] Bonus claimed after:', timeCount, 'seconds')
            timeCount = 0
            catchNextBonus = true
        } else {
            timeCount++
        }
    }, 1000)
}

const stopInterval = () => {
    featureEnabled = false
    clearInterval(interval)
    interval = null
}

const injectToggle = () => {
    const chatSettingsEl = document.querySelector('.chat-settings__popover .chat-settings__content > div')
    if (!chatSettingsEl) return
    
    // Check if toggle already exists to prevent duplicates
    if (chatSettingsEl.querySelector('[data-twitch-auto-claim-toggle]')) return

    const featureToggleEl = Array.from(chatSettingsEl.children).find(child => child.querySelector('input[type="checkbox"]')).cloneNode(true)
    featureToggleEl.setAttribute('data-twitch-auto-claim-toggle', 'true')
    featureToggleEl.querySelector('label').textContent = '[TwitchAutoClaimExt] Auto Claim'
    featureToggleEl.querySelector('input').checked = featureEnabled
    
    featureToggleEl.querySelector('input').addEventListener('change', () => {
        featureEnabled = featureToggleEl.querySelector('input').checked
        localStorage.setItem('twitchAutoClaimEnabled', featureEnabled.toString())
        
        if (featureEnabled) {
            startInterval()
            console.log('[TwitchAutoClaim] Auto claim feature enabled')
        } else {
            stopInterval()
            console.log('[TwitchAutoClaim] Auto claim feature disabled')
        }
    })
    
    chatSettingsEl.appendChild(featureToggleEl)
}

const injectTotalPointsData = () => {
    const modalBodyEl = document.querySelector('.reward-center__content__with-bits-rewards .reward-center-body')
    if (!modalBodyEl) return

    const injectedTotalPointsEl = modalBodyEl.querySelector('.rewards-list').children[0].cloneNode(true)
    injectedTotalPointsEl.children[0].textContent = `TwitchAutoClaim Total Points (This session)`
    injectedTotalPointsEl.innerHTML += `
        <p style="margin-top: 5px;">Total points: ${totalPoints}</p>
        <p>Total watch points: ${totalWatchPoints}</p>
        <p>Total auto claim points: ${totalAutoClaimPoints}</p>
    `
    modalBodyEl.prepend(injectedTotalPointsEl)
}

// Set up MutationObserver to watch for chat settings popover
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            // Check if the added node is an element
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.matches('.chat-settings__popover') || node.querySelector('.chat-settings__popover')) {
                    // Small delay to ensure the popover content is fully rendered
                    setTimeout(injectToggle, 100)
                }

                if (node.matches('.reward-center__content__with-bits-rewards') || node.querySelector('.reward-center__content__with-bits-rewards')) {
                    setTimeout(injectTotalPointsData, 100)
                }

                if (node.matches('strong.community-points-summary__points-add-text') || node.querySelector('strong.community-points-summary__points-add-text')) {
                    const points = node.textContent.match(/\d+/)[0]
                    totalPoints += parseInt(points)

                    console.log('[TwitchAutoClaim] Total points:', totalPoints)

                    if (catchNextBonus) {
                        totalAutoClaimPoints += parseInt(points)
                        catchNextBonus = false
                        console.log('[TwitchAutoClaim] Total auto claim points:', totalAutoClaimPoints)
                    } else {
                        totalWatchPoints += parseInt(points)
                        console.log('[TwitchAutoClaim] Total watch points:', totalWatchPoints)
                    }

                }
            }
        })
    })
})

// Start observing the document for changes
observer.observe(document.body, {
    childList: true,
    subtree: true
})

// Start the interval on page load
startInterval()