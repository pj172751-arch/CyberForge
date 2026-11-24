import React from 'react';
import { getTaskCyberBg } from '../data/cyberTasks';
import { splitChars } from '../utils/cardHover';

export default function CyberCard({ task, role, onClick, isAlt }) {
  const isAttacker = role === 'attacker';

  return (
    <div
      className={`card ${isAlt ? 'card--alt' : ''}`}
      onClick={onClick}
      title={`Inspect ${task.title}`}
    >
      {/* Tactical Task Card Body (scales to 0.85 and dims/saturates on hover) */}
      <div
        className={`card__img card__task-display ${
          isAttacker ? 'card__task-display--attacker' : 'card__task-display--defender'
        }`}
        style={{
          backgroundImage: getTaskCyberBg(task.num, role, task.title)
        }}
      >
        <div className="card__task-inner">
          {/* Top: Icon & Protocol number */}
          <div className="card__task-header">
            <div
              className={`card__task-icon-wrap ${
                isAttacker
                  ? 'card__task-icon-wrap--attacker'
                  : 'card__task-icon-wrap--defender'
              }`}
            >
              {task.svg}
            </div>
            <span className="card__task-protocol-tag">
              PROTOCOL #{task.num}
            </span>
          </div>

          {/* Body: Clean Title Only */}
          <div className="card__task-body">
            <h3 className="card__task-title">{task.title}</h3>
          </div>

          {/* Footer: Status Badge */}
          <div className="card__task-footer">
            <span
              className={`card__task-badge ${
                isAttacker
                  ? 'card__task-badge--attacker'
                  : 'card__task-badge--defender'
              }`}
            >
              {task.badge}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Frosted-Glass Cut-Corner Boxes sliding in on hover */}
      {/* Box A (top-left): Large Protocol Number & Tag */}
      <div className="card__box card__box--a">
        <span className="card__box-number">{splitChars(task.num)}</span>
        <span className="card__box-tags">{splitChars(`SYS//${task.num}`)}</span>
      </div>

      {/* Box B (top-right): Category / Badge */}
      <div className="card__box card__box--b">
        <span className="card__box-category">{splitChars(task.badge)}</span>
      </div>

      {/* Box C (bottom-left): Cyber Tags */}
      <div className="card__box card__box--c">
        <span className="card__box-tags">{task.tags}</span>
      </div>

      {/* Box D (bottom-right): Task Title */}
      <div className="card__box card__box--d">
        <span className="card__box-category">{splitChars(task.title)}</span>
      </div>
    </div>
  );
}
