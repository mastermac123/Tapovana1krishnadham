import { redirect } from 'next/navigation';

/** The desk always opens on circulars, matching the prototype's default. */
export default function DeskIndex() {
  redirect('/desk/circular');
}
