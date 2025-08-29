import { formatAIResponse } from './utils';

describe('formatAIResponse', () => {
  it('should format bullet points on the same line', () => {
    const input = 'Some text • Item 1 • Item 2 • Item 3';
    const expected = 'Some text\n• Item 1\n• Item 2\n• Item 3';
    expect(formatAIResponse(input)).toBe(expected);
  });

  it('should handle numbered lists', () => {
    const input = 'Here are the steps: 1. First step 2. Second step 3. Third step';
    const expected = 'Here are the steps: 1. First step\n2. Second step\n3. Third step';
    expect(formatAIResponse(input)).toBe(expected);
  });

  it('should handle asterisk bullets', () => {
    const input = 'List items * First * Second * Third';
    const expected = 'List items\n* First\n* Second\n* Third';
    expect(formatAIResponse(input)).toBe(expected);
  });

  it('should handle dash bullets', () => {
    const input = 'Tasks - Task 1 - Task 2 - Task 3';
    const expected = 'Tasks\n- Task 1\n- Task 2\n- Task 3';
    expect(formatAIResponse(input)).toBe(expected);
  });

  it('should preserve existing line breaks', () => {
    const input = 'Title\n• Item 1\n• Item 2';
    const expected = 'Title\n• Item 1\n• Item 2';
    expect(formatAIResponse(input)).toBe(expected);
  });

  it('should handle mixed formatting', () => {
    const input = 'Some text • Point 1 • Point 2\n\nAnother section: 1. Step one 2. Step two';
    const expected = 'Some text\n• Point 1\n• Point 2\n\nAnother section: 1. Step one\n2. Step two';
    expect(formatAIResponse(input)).toBe(expected);
  });

  it('should clean up multiple line breaks', () => {
    const input = 'Text\n\n\n\nMore text';
    const expected = 'Text\n\nMore text';
    expect(formatAIResponse(input)).toBe(expected);
  });

  it('should ensure space after bullet points', () => {
    const input = '•No space •Also no space';
    const expected = '• No space\n• Also no space';
    expect(formatAIResponse(input)).toBe(expected);
  });
});