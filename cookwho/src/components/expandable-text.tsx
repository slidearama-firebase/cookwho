'use client';

import { useState } from 'react';
import { Button } from './ui/button';

type ExpandableTextProps = {
  text: string;
  maxLength: number;
};

export function ExpandableText({ text, maxLength }: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (text.length <= maxLength) {
    return <p className="text-sm text-muted-foreground">{text}</p>;
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const truncatedText = isExpanded ? text : `${text.substring(0, maxLength)}...`;

  return (
    <div>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
        {truncatedText}
      </p>
      <Button
        variant="link"
        className="p-0 h-auto text-sm text-primary hover:text-primary/80"
        onClick={toggleExpanded}
      >
        {isExpanded ? 'Read Less' : 'Read More'}
      </Button>
    </div>
  );
}
