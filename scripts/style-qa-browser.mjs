export async function geometry(page, precision) {
  return page.evaluate((digits) => {
    const round = value => Number(value.toFixed(digits));
    return [...document.querySelectorAll('body, body *')].filter(el => !['SCRIPT', 'STYLE'].includes(el.tagName)).map((el, index) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return { index, tag: el.tagName, id: el.id, class: el.getAttribute('class'),
        rect: [rect.x, rect.y, rect.width, rect.height].map(round),
        transform: style.transform, clipPath: style.clipPath,
      };
    });
  }, precision);
}

export async function colors(page) {
  return page.evaluate(() => {
    const properties = [
      'color', 'background-color', 'background-image',
      'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
      'outline-color', 'box-shadow', 'text-shadow', 'fill', 'stroke',
      '-webkit-text-stroke-color', 'accent-color', 'caret-color', 'text-decoration-color', 'column-rule-color', 'filter',
    ];
    return [...document.querySelectorAll('body, body *')].filter(el => !['SCRIPT', 'STYLE'].includes(el.tagName)).map((el, index) => ({
      index, tag: el.tagName, id: el.id, class: el.getAttribute('class'),
      styles: [null, '::before', '::after', ...(el.tagName === 'DIALOG' ? ['::backdrop'] : [])].map(pseudo => {
        const style = getComputedStyle(el, pseudo);
        return { pseudo, values: properties.map(property => style.getPropertyValue(property)) };
      }),
    }));
  });
}

export async function focusState(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await settleTransitions(page);
  return page.evaluate(() => {
    const el = document.activeElement;
    const style = getComputedStyle(el);
    return {
      tag: el.tagName, id: el.id, class: el.getAttribute('class'), name: el.getAttribute('name'),
      text: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 100),
      visible: el.matches(':focus-visible'), outline: style.outline, shadow: style.boxShadow,
      color: style.color, background: style.backgroundColor,
    };
  });
}

export async function settleTransitions(page) {
  return page.evaluate(() => {
    document.body.getBoundingClientRect();
    const transitions = document.getAnimations().filter(animation =>
      (animation instanceof CSSTransition || animation instanceof CSSAnimation)
      && animation.effect.getComputedTiming().iterations !== Infinity);
    window.__qaTransitionSamples ??= [];
    for (const animation of transitions) {
      if (window.__qaTransitionSamples.length < 50) window.__qaTransitionSamples.push({
        property: animation instanceof CSSTransition ? animation.transitionProperty : animation.animationName,
        duration: animation.effect.getComputedTiming().duration,
        currentTime: animation.currentTime,
      });
      animation.finish();
    }
    return transitions.length;
  });
}

