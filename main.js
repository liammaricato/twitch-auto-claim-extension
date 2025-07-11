let timeCount = 0
let interval = null
let featureEnabled = localStorage.getItem('twitchAutoClaimEnabled') !== 'false' // Default to true unless explicitly disabled
let catchNextBonus = false

const defaultPointsObject = {
    total: 0,
    watch: 0,
    autoClaim: 0
}

let sessionPoints = defaultPointsObject
let currentChannel = window.location.pathname.split('/')[1]
let allTimePoints = localStorage.getItem('twitchAutoClaimAllTimePoints') ? JSON.parse(localStorage.getItem('twitchAutoClaimAllTimePoints')) : {
    [currentChannel]: defaultPointsObject
}

if (!allTimePoints[currentChannel]) allTimePoints[currentChannel] = defaultPointsObject

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

const injectPointsData = () => {
    const modalBodyEl = document.querySelector('.reward-center__content__with-bits-rewards .reward-center-body')
    if (!modalBodyEl) return

    const injectedSessionPointsEl = modalBodyEl.querySelector('.rewards-list').children[0].cloneNode(true)
    const injectedAllTimePointsEl = modalBodyEl.querySelector('.rewards-list').children[0].cloneNode(true)

    injectedSessionPointsEl.children[0].textContent = `TwitchAutoClaim Total Points (This session)`
    injectedSessionPointsEl.innerHTML += `
        <p style="margin-top: 5px;">Total points: ${sessionPoints.total}</p>
        <p>Total watch points: ${sessionPoints.watch}</p>
        <p>Total auto claim points: ${sessionPoints.autoClaim}</p>
    `

    injectedAllTimePointsEl.children[0].textContent = `TwitchAutoClaim Total Points (All time)`
    injectedAllTimePointsEl.innerHTML += `
        <p style="margin-top: 5px;">Total points: ${allTimePoints[currentChannel].total}</p>
        <p>Total watch points: ${allTimePoints[currentChannel].watch}</p>
        <p>Total auto claim points: ${allTimePoints[currentChannel].autoClaim}</p>
    `

    modalBodyEl.prepend(injectedSessionPointsEl)
    modalBodyEl.prepend(injectedAllTimePointsEl)
}

const updatePointsData = (points) => {
    sessionPoints.total += parseInt(points)
    allTimePoints[currentChannel].total += parseInt(points)

    if (catchNextBonus) {
        sessionPoints.autoClaim += parseInt(points)
        allTimePoints[currentChannel].autoClaim += parseInt(points)
        catchNextBonus = false
        console.log('[TwitchAutoClaim] New auto claim points:', points)
    } else {
        sessionPoints.watch += parseInt(points)
        allTimePoints[currentChannel].watch += parseInt(points)
        console.log('[TwitchAutoClaim] New watch points:', points)
    }

    localStorage.setItem('twitchAutoClaimAllTimePoints', JSON.stringify(allTimePoints))
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
                    setTimeout(injectPointsData, 100)
                }

                if (node.matches('strong.community-points-summary__points-add-text') || node.querySelector('strong.community-points-summary__points-add-text')) {
                    const points = node.textContent.match(/\d+/)[0]
                    updatePointsData(parseInt(points))
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