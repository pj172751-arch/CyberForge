import React from 'react';
import { gsap } from 'gsap';

/**
 * Character splitting helper for GSAP staggered text animation
 */
export const splitChars = (text) => {
  if (!text) return null;
  return String(text).split('').map((char, idx) =>
    React.createElement(
      'span',
      { key: idx, className: 'char' },
      char === ' ' ? '\u00A0' : char
    )
  );
};

/**
 * Class representing a box inside a card.
 */
export class CardBox {
  DOM = {
    el: null,
    number: null,
    numberChars: null,
    tags: null,
    category: null,
    categoryChars: null
  };

  constructor(DOM_el) {
    this.DOM.el = DOM_el;
    this.DOM.number = this.DOM.el.querySelector('.card__box-number');
    this.DOM.tags = this.DOM.el.querySelector('.card__box-tags');
    this.DOM.category = this.DOM.el.querySelector('.card__box-category');

    if (this.DOM.number) {
      this.DOM.numberChars = this.DOM.number.querySelectorAll('.char');
    }
    if (this.DOM.category) {
      this.DOM.categoryChars = this.DOM.category.querySelectorAll('.char');
    }
  }
}

/**
 * Class representing Card1 (Codrops signature 4-corner sliding boxes + scale down).
 */
export class Card1 {
  DOM = {
    el: null,
    img: null,
    boxes: null
  };
  cardBoxesArr = [];

  constructor(DOM_el) {
    this.DOM.el = DOM_el;
    this.DOM.img = this.DOM.el.querySelector('.card__img');
    this.boxes = [...this.DOM.el.querySelectorAll('.card__box')];
    this.boxes.forEach((boxEl) => this.cardBoxesArr.push(new CardBox(boxEl)));
    this.initEvents();
  }

  get cardBoxElements() {
    return this.cardBoxesArr.map((box) => box.DOM.el);
  }
  get cardBoxNumberChars() {
    const list = [];
    this.cardBoxesArr.forEach((box) => {
      if (box.DOM.numberChars) list.push(...box.DOM.numberChars);
    });
    return list;
  }
  get cardBoxCategoryChars() {
    const list = [];
    this.cardBoxesArr.forEach((box) => {
      if (box.DOM.categoryChars) list.push(...box.DOM.categoryChars);
    });
    return list;
  }

  initEvents() {
    this.onEnter = (event) => this.enter(event);
    this.onLeave = (event) => this.leave(event);
    this.DOM.el.addEventListener('mouseenter', this.onEnter);
    this.DOM.el.addEventListener('mouseleave', this.onLeave);
  }

  enter() {
    if (this.leaveTimeline) {
      this.leaveTimeline.kill();
    }

    this.enterTimeline = gsap
      .timeline({
        defaults: {
          duration: 0.5,
          ease: 'expo'
        }
      })
      .addLabel('start', 0)
      .fromTo(
        this.DOM.img,
        {
          filter: 'saturate(100%) brightness(100%)'
        },
        {
          scale: 0.85,
          filter: 'saturate(200%) brightness(70%)'
        },
        'start'
      )
      .fromTo(
        this.cardBoxElements,
        {
          opacity: 0,
          xPercent: (_, target) => {
            if (target.classList.contains('card__box--a')) return -100;
            if (target.classList.contains('card__box--b')) return 100;
            if (target.classList.contains('card__box--c')) return -100;
            if (target.classList.contains('card__box--d')) return 100;
            return 0;
          },
          yPercent: (_, target) => {
            if (target.classList.contains('card__box--a')) return -100;
            if (target.classList.contains('card__box--b')) return -100;
            if (target.classList.contains('card__box--c')) return 100;
            if (target.classList.contains('card__box--d')) return 100;
            return 0;
          }
        },
        {
          opacity: 1,
          xPercent: 0,
          yPercent: 0
        },
        'start'
      );

    if (this.cardBoxNumberChars.length > 0) {
      this.enterTimeline.fromTo(
        this.cardBoxNumberChars,
        {
          opacity: 0
        },
        {
          duration: 0.3,
          opacity: 1,
          stagger: 0.08
        },
        'start+=.15'
      );
    }

    if (this.cardBoxCategoryChars.length > 0) {
      this.enterTimeline.fromTo(
        this.cardBoxCategoryChars,
        {
          opacity: 0
        },
        {
          duration: 0.12,
          opacity: 1,
          stagger: {
            from: 'random',
            each: 0.04
          }
        },
        'start+=.15'
      );
    }
  }

  leave() {
    if (this.enterTimeline) {
      this.enterTimeline.kill();
    }

    this.leaveTimeline = gsap
      .timeline({
        defaults: {
          duration: 0.65,
          ease: 'expo'
        }
      })
      .addLabel('start', 0)
      .to(
        this.DOM.img,
        {
          scale: 1,
          filter: 'saturate(100%) brightness(100%)'
        },
        'start'
      )
      .to(
        this.cardBoxElements,
        {
          opacity: 0,
          xPercent: (_, target) => {
            if (target.classList.contains('card__box--a')) return -100;
            if (target.classList.contains('card__box--b')) return 100;
            if (target.classList.contains('card__box--c')) return -100;
            if (target.classList.contains('card__box--d')) return 100;
            return 0;
          },
          yPercent: (_, target) => {
            if (target.classList.contains('card__box--a')) return -100;
            if (target.classList.contains('card__box--b')) return -100;
            if (target.classList.contains('card__box--c')) return 100;
            if (target.classList.contains('card__box--d')) return 100;
            return 0;
          }
        },
        'start'
      );
  }

  destroy() {
    if (this.enterTimeline) this.enterTimeline.kill();
    if (this.leaveTimeline) this.leaveTimeline.kill();
    this.DOM.el.removeEventListener('mouseenter', this.onEnter);
    this.DOM.el.removeEventListener('mouseleave', this.onLeave);
  }
}
