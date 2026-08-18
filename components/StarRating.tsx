import { StarFilled } from '@ant-design/icons';

interface StarRatingProps {
    score: number;
    size?: number | string;
    className?: string;
}

export default function StarRating({ score, size = 12, className = '' }: StarRatingProps) {
    // Ensure score is between 0 and 5
    const clampedScore = Math.max(0, Math.min(5, score));

    return (
        <div className={`flex items-center gap-0.5 ${className}`}>
            {[1, 2, 3, 4, 5].map((index) => {
                // Calculate fill percentage for this star
                // If score is 4.5:
                // index 1: 4.5 >= 1 so 100%
                // index 4: 4.5 >= 4 so 100%
                // index 5: 4.5 < 5, diff is 0.5 so 50%
                // index 6: 0%

                let percentage = 0;
                if (clampedScore >= index) {
                    percentage = 100;
                } else if (clampedScore > index - 1) {
                    percentage = (clampedScore - (index - 1)) * 100;
                }

                return (
                    <div key={index} className="relative inline-block text-gray-300" style={{ fontSize: size }}>
                        {/* Background (Empty) Star */}
                        <StarFilled />

                        {/* Foreground (Filled) Star with mask */}
                        <div
                            className="absolute top-0 left-0 overflow-hidden text-gray-900"
                            style={{ width: `${percentage}%` }}
                        >
                            <StarFilled />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
