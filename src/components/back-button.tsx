'use client';

import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

export function BackButton() {
    const router = useRouter();

    const handleGoBack = () => {
        router.back();
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="xl" onClick={handleGoBack}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                <p>Back</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
