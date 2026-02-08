import { nanoid } from 'nanoid'

export function generateId(): string {
  return nanoid()
}

export function randomInteger(): number {
  return Math.floor(Math.random() * 2 ** 31)
}

export function randomVersionNonce(): number {
  return randomInteger()
}
