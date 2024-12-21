"use client"
import { avatarPlaceholderUrl, navItems } from '@/constants'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'
interface Props{
  fullName: string;
  avatar:string;
  email: string;
}
const Search = ({fullName,avatar,email}:Props) => {
  const pathname = usePathname()
  return (
    <aside className='sidebar'>
      <Link href="/">
      <Image src="/assets/icons/logo-full-brand.svg" alt="logo" width={160} height={50} className='hidden h-auto lg:block'/>
      <Image src="/assets/icons/logo-brand.svg" alt="logo" width={52} height={52} className='lg:hidden'/>
      </Link>
      <nav className='sidebar-nav'>
        <ul className='flex-1 flex-col gap-6'>
          {navItems.map(({url,name,icon})=>(
          <Link className='lg:w-full' key={name} href={url}><li className={cn("sidebar-nav-item",pathname===url && "shad-active")}>
            <Image className={cn("nav-icon", pathname===url &&"nav-icon-active")} src={icon} alt={name} width={24} height={24}/><p className='hidden lg:block'>{name}</p></li></Link>
      ))}</ul></nav>
      <Image src="/assets/images/files-2.png" alt="logo" width={506} height={418} className='w-full'/>
      <div className='sidebar-user-info'> <Image src={avatarPlaceholderUrl} alt="avatar" width={44} height={44} className='sidebar-user-avatar'/>
      <div className='hidden lg:block '>
        <p className='subtitle-2 capitalize'>{fullName}</p>
        <p className='subtitle-2 capitalize'>{email}</p></div></div>
    </aside>
  )
}

export default Search