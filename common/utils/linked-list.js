class Node {
  constructor(value) {
    this.value = value
    this.next = null
  }
}

export class LinkedList {
  constructor() {
    this.head = null
    this.current = null
  }

  // Add a new item to the linked list
  add(item) {
    const node = new Node(item) // Use the Node class to ensure proper structure
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

  // Move to the first item in the list
  first() {
    if (this.head) {
      this.current = this.head
      return true
    }
    return false
  }

  // Move to the next item in the list and return its value
  next() {
    if (this.current && this.current.next) {
      this.current = this.current.next
      return this.current.value
    } else if (this.current) {
      // Loop back to the first item if looping is enabled
      this.current = this.head
      return this.current ? this.current.value : null
    }
    return null
  }

  // Check if the list is empty
  isEmpty() {
    return this.head === null
  }

  // Get the current item
  getCurrent() {
    return this.current ? this.current.value : null
  }
}

// For backward compatibility with non-module scripts
if (typeof window !== 'undefined') {
  window.LinkedList = LinkedList
}