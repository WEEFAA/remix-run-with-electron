import { clientEntry, on, type Handle, type SerializableProps } from 'remix/ui'

interface SampleButtonProps extends SerializableProps {
  ctr?: number
}

export const SampleButton = clientEntry(
  import.meta.url,
  function SampleButton(handle: Handle<SampleButtonProps>) {
    let ctr = handle.props.ctr ?? 0
    return () => (
      <button
        mix={on('click', () => {
          ctr++
          handle.update()
        })}
      >
        Counter {ctr}
      </button>
    )
  },
)
