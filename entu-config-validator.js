class EntuConfigValidator {
    constructor(configuration) {
        this.configuration = configuration || {}
        this.errors = []
        this.warnings = []
    }

    validate() {
        if (!this.configuration || Object.keys(this.configuration).length === 0) {
            this.errors.push('Configuration is empty')
            return this.getResult()
        }
        // console.log(JSON.stringify(this.configuration, null, 2))

        this.validateBasicStructure()
        this.validateProperties()
        this.validateRelations()
        
        return this.getResult()
    }

    validateBasicStructure() {
        const required = ['_id', 'name']
        required.forEach(field => {
            if (!this.configuration[field]) {
                this.errors.push(`Missing required field: ${field}`)
            }
        })

        if (this.configuration._type[0]?.string !== 'sw_screen_group') {
            this.errors.push('Invalid entity type: Must be sw_screen_group')
        }
    }

    validateProperties() {
        const properties = this.configuration.properties || {}
        const required = ['name']

        required.forEach(prop => {
            if (!properties[prop] || !properties[prop].length) {
                this.errors.push(`Missing required property: ${prop}`)
            }
        })
    }

    validateRelations() {
        const relations = this.configuration._relationships || {}
        const required = ['screens', 'configuration']

        required.forEach(rel => {
            if (!relations[rel] || !relations[rel].length) {
                this.errors.push(`Missing required relation: ${rel}`)
            }
        })
    }

    getResult() {
        return {
            isValid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings
        }
    }
}