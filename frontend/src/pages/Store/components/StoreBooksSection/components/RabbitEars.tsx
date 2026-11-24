import styles from './RabbitEars.module.css';

export interface RabbitEarsProps {
  color: string;
  className?: string;
}

export function RabbitEars({ color, className = '' }: RabbitEarsProps) {
  return (
    <div
      className={`${styles.earsWrapper} ${className}`.trim()}
      style={{ color }}
      aria-hidden="true"
    >
      {/* Left Ear SVG */}
      <svg
        className={styles.leftEar}
        viewBox="0 0 44 45"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M1.335.198c.671-.316 1.5-.254 2.186.187C27.678 16.847 39.839 36.953 44 45h-6.048c-2.382-1.604-6.964-3.674-15.652-4.814C2.999 37.666-.665 14.174.09 2.04.152 1.28.589.515 1.335.198Z"
          fill="currentColor"
        />
      </svg>

      {/* Right Ear SVG */}
      <svg
        className={styles.rightEar}
        viewBox="0 0 29 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M19.388.879c.667-.771 1.647-1.018 2.559-.807.912.21 1.682.956 1.926 1.861C34.595 38.09 25.79 69.237 21.823 80h-4.188c-.17-4.22-2.739-13.318-10.975-22.064-8.493-9.099-8.88-21.913-1.063-37.23C11.221 9.603 19.091 1.266 19.388.879Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}
