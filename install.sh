#!/usr/bin/env bash
# install.sh — bootstrap claude-config on a macOS / Linux machine.
#
# Idempotent. Per-item symlinks (skill / command / agent), so other
# skills (Pocock's, the work repo's, anthropic-skills, marketplace)
# coexist in ~/.claude/skills/ without either side clobbering the other.
#
# Usage:
#   ./install.sh             # default: symlink mode
#   ./install.sh --copy      # fallback (copies instead of symlinking)
#   ./install.sh --dry-run   # show what would be done; no changes
#
# Symlink mode requires no special privileges on POSIX. The --copy
# fallback is provided for symmetry with the Windows installer.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_ROOT="$HOME/.claude"
CLAUDE_SKILLS="$CLAUDE_ROOT/skills"
CLAUDE_CMDS="$CLAUDE_ROOT/commands"
CLAUDE_AGENTS="$CLAUDE_ROOT/agents"

MODE=symlink
DRY_RUN=false
for arg in "$@"; do
    case "$arg" in
        --copy)    MODE=copy ;;
        --dry-run) DRY_RUN=true ;;
        *) echo "Unknown arg: $arg"; exit 1 ;;
    esac
done

echo
echo "claude-config installer"
echo "  Repo:        $REPO_ROOT"
echo "  Target root: $CLAUDE_ROOT"
echo "  Mode:        $MODE$([ "$DRY_RUN" = true ] && echo ' (dry-run)' || true)"
echo

# Ensure target dirs exist.
if [ "$DRY_RUN" = false ]; then
    mkdir -p "$CLAUDE_SKILLS" "$CLAUDE_CMDS" "$CLAUDE_AGENTS"
fi

install_item() {
    local source="$1"
    local target="$2"
    local name
    name="$(basename "$source")"

    if [ -e "$target" ] || [ -L "$target" ]; then
        # Already a symlink to our source? Skip.
        if [ -L "$target" ] && [ "$(readlink "$target")" = "$source" ]; then
            echo "  [skip] $name (already linked)"
            return
        fi
        echo "  [WARN] $target exists and is NOT a symlink to our source."
        if [ "$MODE" != copy ]; then
            echo "         Move it aside before rerunning, OR pass --copy to overwrite."
            return
        fi
    fi

    if [ "$DRY_RUN" = true ]; then
        echo "  [dry] would $MODE: $name"
        return
    fi

    if [ "$MODE" = copy ]; then
        rm -rf "$target"
        if [ -d "$source" ]; then
            cp -R "$source" "$target"
        else
            cp "$source" "$target"
        fi
        echo "  [copy] $name"
    else
        ln -snf "$source" "$target"
        echo "  [link] $name"
    fi
}

echo "Skills:"
for skill_dir in "$REPO_ROOT/skills"/*/; do
    skill="${skill_dir%/}"
    install_item "$skill" "$CLAUDE_SKILLS/$(basename "$skill")"
done

echo
echo "Commands:"
shopt -s nullglob
for cmd in "$REPO_ROOT/commands"/*; do
    install_item "$cmd" "$CLAUDE_CMDS/$(basename "$cmd")"
done

echo
echo "Agents:"
agents=("$REPO_ROOT/agents"/*)
if [ -e "${agents[0]:-}" ]; then
    for agent in "${agents[@]}"; do
        install_item "$agent" "$CLAUDE_AGENTS/$(basename "$agent")"
    done
else
    echo "  (none in repo yet)"
fi

echo
echo "Done."
echo
echo "Next steps:"
echo "  1. If this is a fresh machine, install Pocock's 16 skills via:"
echo "       npx skills@latest add mattpocock/skills"
echo "  2. Reference docs are in $REPO_ROOT/reference/ — symlink or"
echo "     copy as you prefer."
echo "  3. settings.json is per-machine; not synced. See"
echo "     $REPO_ROOT/README.md for the conventions."
