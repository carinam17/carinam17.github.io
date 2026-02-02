import pygame
import sys

pygame.init()

# ---------- Window ----------
WIDTH, HEIGHT = 900, 400
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Even and Odd Numbers: 2k and 2k + 1")

# ---------- Fonts ----------
font = pygame.font.SysFont("arial", 24)
big_font = pygame.font.SysFont("arial", 32)

# ---------- Colors ----------
WHITE = (255, 255, 255)
BLACK = (30, 30, 30)
GRAY = (180, 180, 180)
BLUE = (70, 130, 180)
RED = (200, 80, 80)

# ---------- Number Line ----------
CENTER_X = WIDTH // 2
LINE_Y = HEIGHT // 2
SCALE = 40      # pixels per unit
VISIBLE_RANGE = 10  # integers shown left/right of zero

k = 0  # starting value

clock = pygame.time.Clock()

def draw_number_line():
    pygame.draw.line(screen, BLACK, (0, LINE_Y), (WIDTH, LINE_Y), 2)

    for i in range(-VISIBLE_RANGE, VISIBLE_RANGE + 1):
        x = CENTER_X + i * SCALE
        pygame.draw.line(screen, BLACK, (x, LINE_Y - 8), (x, LINE_Y + 8), 2)

        label = font.render(str(i), True, BLACK)
        screen.blit(label, (x - label.get_width() // 2, LINE_Y + 10))

def draw_point(value, color, label_text, y_offset):
    x = CENTER_X + value * SCALE
    pygame.draw.circle(screen, color, (x, LINE_Y), 8)

    label = font.render(label_text, True, color)
    screen.blit(label, (x - label.get_width() // 2, LINE_Y + y_offset))

running = True
while running:
    clock.tick(60)
    screen.fill(WHITE)

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_RIGHT:
                k += 1
            elif event.key == pygame.K_LEFT:
                k -= 1

    even = 2 * k
    odd = 2 * k + 1

    # Draw visuals
    draw_number_line()
    draw_point(even, BLUE, f"2k = {even}", -40)
    draw_point(odd, RED, f"2k + 1 = {odd}", -70)

    # Text
    title = big_font.render("Even and Odd Numbers", True, BLACK)
    screen.blit(title, (WIDTH // 2 - title.get_width() // 2, 20))

    info = font.render(f"k = {k}   (Use LEFT / RIGHT arrows)", True, BLACK)
    screen.blit(info, (WIDTH // 2 - info.get_width() // 2, HEIGHT - 40))

    pygame.display.flip()

pygame.quit()
sys.exit()

