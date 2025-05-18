// Disclaimer: no semicolons, if unnecessary, are used in this project

export function extendLinkedList(LinkedList) {
    LinkedList.prototype.first = function() {
        if (this.head) {
            this.current = this.head
            return true
        }
        return false
    }

    LinkedList.prototype.next = function() {
        if (!this.head) {
            console.error('LinkedList is empty')
            return false
        }
        
        if (!this.current) {
            console.error('No current node in LinkedList')
            return this.first() // Try to move to first
        }
        
        if (this.current.next) {
            console.log('Moving to next node in LinkedList')
            this.current = this.current.next
            return true
        } else {
            // Loop back to beginning
            console.log('Reached end of LinkedList, looping back to beginning')
            this.current = this.head
            return true
        }
    }

    LinkedList.prototype.add = function(item) {
        const node = { value: item, next: null }
        if (!this.head) {
            this.head = node
            this.current = node
        } else {
            let tail = this.head
            while (tail.next) {
                tail = tail.next
            }
            tail.next = node
        }
    }
    
    // Add a method to get the current node's value
    LinkedList.prototype.getCurrent = function() {
        if (this.current) {
            return this.current.value
        }
        return null
    }
}
