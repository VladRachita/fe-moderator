'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/ui/Header';

const HEADER_VISIBLE_ROUTES = ['/dashboard', '/analytics', '/super-admin', '/host'];

const HeaderWrapper: React.FC = () => {
    const pathname = usePathname();
    const showHeader = HEADER_VISIBLE_ROUTES.some((route) => pathname.startsWith(route));

    if (!showHeader) {
        return null;
    }

    return <Header />;
};

export default HeaderWrapper;
