class ConfigIterator {
    constructor(seed_array) {
        this.items = [].concat(seed_array || [])
    }

    add(item) {
        this.items.push(item)
    }

    get count() {
        return this.items.length
    }

    get hasItems() {
        return this.items.length > 0
    }

    async fetchFromPublisher(screen_id) {
        const u = `${SCREENWERK_PUBLISHER_API}${screen_id}.json`
        const configuration = await fetchJSON(u)
        const validator = new ConfigValidator(configuration)
        const validation = validator.validate()
        return {
            configuration: configuration,
            validation: validation
        }
    }

    async fetchFromEntu(screengroup_id) {
        const u = `${ENTU_ENTITY_URL}/${screengroup_id}`
        const configuration = (await fetchJSON(u)).entity
        const validator = new EntuDeepValidator()
        // const validator = new EntuValidator(configuration, 
        //     {
        //         type: 'sw_screen_group',
        //         fields: ['_id'], 
        //         properties: ['name'], 
        //         relations: ['configuration']
        //     })
        const validation = await validator.validate(screengroup_id)
        return {
            configuration: configuration,
            validation: validation
        }
    }

    [Symbol.iterator]() {
        let items = this.items
        const self = this
        return {
            next: async function() {
                if (items.length) {
                    const item = items.shift()
                    const screen_id = item.screen_id
                    const screengroup_id = item.screengroup_id
                    
                    return {
                        value: {
                            screengroup_id: screengroup_id,
                            swpublisher: await self.fetchFromPublisher(screen_id),
                            entu_screengroup: await self.fetchFromEntu(screengroup_id),
                        },
                        done: false,
                    }
                }
                return { done: true }
            }
        }
    }
}