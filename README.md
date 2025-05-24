# GitHub Actions Project / Build Report

An experiment in Copilot agent mode to build a report, with a bunch of refactoring and cleanups to make it somewhat understandable.

No frameworks, no libraries, just plain HTML/CSS/JavaScript.

# Future

## Duration

Duration of build. Looks like in GitHub Actions, the duration needs to be calculated.
- See: created_at, updated_at, run_started_at on a workflow run/attempt?
- Format as HH:MM:SS or similar.

## Trigger

push | pull_request | schedule | manual

## Release Notes

Not as part of this report, but would be nice to have a link from the version number.

## Security

Security stats, including the issues open at each severity level.
- code scanning
- vulnerability alerts
- secrets scanning

## Other

- Tests pass/fail (probably not - if the tests fail, we probably wouldn't publish this report)
- Coverage, or better, a link to the coverage report
- Asset links to both GitHub and Package Registry
- Read any relevant repo labels
- Report on status check results
